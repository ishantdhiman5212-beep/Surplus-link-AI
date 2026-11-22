import sqlite3
from flask import Flask
from volunteer_qr import volunteer_bp, DB_PATH

def init_test_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS food_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            quantity REAL,
            unit TEXT,
            pickup_location TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'Open'
        );
        CREATE TABLE IF NOT EXISTS pickups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listing_id INTEGER NOT NULL,
            recipient_id INTEGER,
            volunteer_id INTEGER,
            status TEXT DEFAULT 'Accepted',
            scheduled_at TEXT
        );
        CREATE TABLE IF NOT EXISTS handover_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pickup_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            verified_at TEXT,
            verified_by INTEGER
        );
    """)
    # Seed 1 test pickup if database is empty
    if conn.execute("SELECT COUNT(*) FROM pickups").fetchone()[0] == 0:
        conn.execute("INSERT INTO organizations (name) VALUES ('NGO A Community Kitchen')")
        conn.execute("""
            INSERT INTO food_listings (title, category, quantity, unit, pickup_location, deadline, status)
            VALUES ('Rice and Dal', 'Cooked Meals', 30, 'kg', 'Campus Canteen Block A', '6:00 PM', 'Accepted')
        """)
        conn.execute("INSERT INTO pickups (listing_id, recipient_id, status) VALUES (1, 1, 'Accepted')")
    conn.commit()
    conn.close()

app = Flask(__name__)
app.secret_key = "test-secret"
app.register_blueprint(volunteer_bp)

if __name__ == "__main__":
    init_test_db()
    app.run(debug=True, port=5000)
