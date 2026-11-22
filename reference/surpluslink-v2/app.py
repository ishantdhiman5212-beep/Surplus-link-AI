"""
SurplusLink AI - Flask Application Entry Point
==============================================
Initializes the Flask server and registers the extraction blueprint.
"""

from flask import Flask, jsonify
from extraction_routes import extraction_bp


def create_app():
    """Application factory for SurplusLink AI backend."""
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    # Register blueprints
    app.register_blueprint(extraction_bp)

    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "SurplusLink AI Extraction Engine",
            "version": "2.0.0",
            "endpoints": {
                "extract": "POST /api/ai/extract",
                "health": "GET /health"
            }
        })

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "SurplusLink AI Extraction Engine"
        }), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
