import io
import base64
import hashlib
import secrets
import sqlite3
from datetime import datetime, timedelta
import qrcode
from flask import Blueprint, request, jsonify, render_template, session

volunteer_bp = Blueprint("volunteer_bp", __name__)
DB_PATH = "surpluslink.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Safe migration: add expires_at if Suryansh's base table doesn't have it yet
    try:
        conn.execute("ALTER TABLE handover_verifications ADD COLUMN expires_at TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    return conn


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


# --- HTML PAGE ROUTES ---
@volunteer_bp.route("/volunteer")
def volunteer_page():
    return render_template("volunteer.html")


@volunteer_bp.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


# --- 1. LIST ACTIVE PICKUPS FOR VOLUNTEER VIEW ---
@volunteer_bp.route("/api/pickups", methods=["GET"])
def get_pickups():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.id AS pickup_id, p.status AS pickup_status, p.scheduled_at,
               f.id AS listing_id, f.title, f.quantity, f.unit,
               f.pickup_location, f.deadline,
               o.name AS recipient_name
        FROM pickups p
        JOIN food_listings f ON p.listing_id = f.id
        LEFT JOIN organizations o ON p.recipient_id = o.id
        ORDER BY p.id DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# --- 2. UPDATE PICKUP STATUS (Accepted -> Pickup in progress) ---
@volunteer_bp.route("/api/pickups/<int:pickup_id>/status", methods=["PATCH"])
def update_pickup_status(pickup_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    allowed_statuses = {"Accepted", "Pickup in progress"}
    if new_status not in allowed_statuses:
        return jsonify({"error": "Invalid status. Use 'Pickup in progress' or verify QR to complete."}), 400

    conn = get_db()
    pickup = conn.execute("SELECT * FROM pickups WHERE id = ?", (pickup_id,)).fetchone()
    if not pickup:
        conn.close()
        return jsonify({"error": "Pickup not found"}), 404

    if pickup["status"] == "Collected":
        conn.close()
        return jsonify({"error": "Completed pickups cannot be modified"}), 400

    conn.execute("UPDATE pickups SET status = ? WHERE id = ?", (new_status, pickup_id))
    conn.execute("UPDATE food_listings SET status = ? WHERE id = ?", (new_status, pickup["listing_id"]))
    conn.commit()
    conn.close()

    return jsonify({"pickup_id": pickup_id, "status": new_status})


# --- 3. GENERATE SINGLE-USE, EXPIRING HANDOVER QR & TOKEN ---
@volunteer_bp.route("/api/pickups/<int:pickup_id>/qr", methods=["POST"])
def generate_pickup_qr(pickup_id):
    conn = get_db()
    pickup = conn.execute("SELECT * FROM pickups WHERE id = ?", (pickup_id,)).fetchone()
    if not pickup:
        conn.close()
        return jsonify({"error": "Pickup not found"}), 404

    if pickup["status"] == "Collected":
        conn.close()
        return jsonify({"error": "Handover already completed for this pickup"}), 400

    raw_token = f"SL-{pickup_id}-{secrets.token_hex(4).upper()}"
    hashed = hash_token(raw_token)
    expires_at = (datetime.now() + timedelta(hours=2)).isoformat(timespec="seconds")

    # Replace any unverified previous token for this pickup
    conn.execute(
        "DELETE FROM handover_verifications WHERE pickup_id = ? AND verified_at IS NULL",
        (pickup_id,)
    )
    conn.execute(
        "INSERT INTO handover_verifications (pickup_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (pickup_id, hashed, expires_at)
    )
    conn.commit()
    conn.close()

    qr_img = qrcode.make(raw_token)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({
        "pickup_id": pickup_id,
        "token": raw_token,
        "expires_at": expires_at,
        "qr_image": f"data:image/png;base64,{qr_base64}"
    })


# --- 4. VERIFY HANDOVER TOKEN (ONE-TIME USE + EXPIRY CHECK) ---
@volunteer_bp.route("/api/pickups/<int:pickup_id>/verify", methods=["POST"])
def verify_pickup_handover(pickup_id):
    data = request.get_json(silent=True) or {}
    submitted_token = data.get("token", "").strip()
    verifier_id = session.get("user_id", 1)

    if not submitted_token:
        return jsonify({"error": "Please scan a QR code or enter a handover token"}), 400

    conn = get_db()
    record = conn.execute(
        "SELECT * FROM handover_verifications WHERE pickup_id = ? ORDER BY id DESC LIMIT 1",
        (pickup_id,)
    ).fetchone()

    if not record:
        conn.close()
        return jsonify({"error": "No handover QR generated for this pickup"}), 404

    # 1. Reject if already used
    if record["verified_at"] is not None:
        conn.close()
        return jsonify({"error": "Token already used! Duplicate handover rejected."}), 400

    # 2. Reject if expired
    if record["expires_at"]:
        if datetime.now() > datetime.fromisoformat(record["expires_at"]):
            conn.close()
            return jsonify({"error": "Handover token expired. Generate a new QR code."}), 400

    # 3. Reject if cryptographic hash does not match
    if hash_token(submitted_token) != record["token_hash"]:
        conn.close()
        return jsonify({"error": "Invalid handover token"}), 400

    # 4. Atomic single-use update
    now_iso = datetime.now().isoformat(timespec="seconds")
    cursor = conn.execute(
        """UPDATE handover_verifications
           SET verified_at = ?, verified_by = ?
           WHERE id = ? AND verified_at IS NULL""",
        (now_iso, verifier_id, record["id"])
    )

    if cursor.rowcount != 1:
        conn.close()
        return jsonify({"error": "Token already redeemed"}), 400

    pickup = conn.execute("SELECT listing_id FROM pickups WHERE id = ?", (pickup_id,)).fetchone()
    conn.execute("UPDATE pickups SET status = 'Collected' WHERE id = ?", (pickup_id,))
    if pickup:
        conn.execute("UPDATE food_listings SET status = 'Collected' WHERE id = ?", (pickup["listing_id"],))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Handover verified! Pickup marked as Collected.",
        "pickup_id": pickup_id,
        "verified_at": now_iso
    })


# --- 5. LIVE IMPACT DASHBOARD METRICS & MAP PINS ---
@volunteer_bp.route("/api/dashboard/impact", methods=["GET"])
def dashboard_impact():
    conn = get_db()
    listings_count = conn.execute("SELECT COUNT(*) FROM food_listings").fetchone()[0]
    pickups_count = conn.execute("SELECT COUNT(*) FROM pickups").fetchone()[0]
    handovers_count = conn.execute(
        "SELECT COUNT(*) FROM handover_verifications WHERE verified_at IS NOT NULL"
    ).fetchone()[0]
    rescued_qty = conn.execute(
        "SELECT COALESCE(SUM(quantity), 0) FROM food_listings WHERE status = 'Collected'"
    ).fetchone()[0]

    listings = conn.execute(
        "SELECT id, title, quantity, unit, pickup_location, status FROM food_listings"
    ).fetchall()
    conn.close()

    demo_coords = [
        [30.5161, 76.6598],  # Campus Canteen
        [30.4840, 76.5926],  # Rajpura Community Kitchen
        [30.7333, 76.7794],  # Chandigarh Shelter Home
    ]

    pins = []
    for idx, item in enumerate(listings):
        lat, lng = demo_coords[idx % len(demo_coords)]
        pins.append({
            "id": item["id"],
            "title": f"{item['title']} ({item['quantity']} {item['unit']})",
            "location": item["pickup_location"],
            "status": item["status"],
            "lat": lat,
            "lng": lng,
            "is_demo_coord": True
        })

    return jsonify({
        "listings_created": listings_count,
        "pickups_accepted": pickups_count,
        "handovers_completed": handovers_count,
        "rescued_quantity": round(float(rescued_qty), 1),
        "map_pins": pins
    })
