#!/usr/bin/env python3
"""
Run the FL Sunbiz Leads API server.

Usage:
    python run.py                    # Production (port 8050)
    python run.py --dev              # Development with reload
    python run.py --port 8080        # Custom port
"""

import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="FL Sunbiz Leads API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8050, help="Port to bind to")
    parser.add_argument("--dev", action="store_true", help="Development mode with reload")
    args = parser.parse_args()

    uvicorn.run(
        "web.backend.api:app",
        host=args.host,
        port=args.port,
        reload=args.dev,
    )


if __name__ == "__main__":
    main()
