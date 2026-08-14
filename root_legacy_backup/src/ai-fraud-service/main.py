"""
AuraBank AI Fraud Service
Runs gRPC (port 9091) and REST/health (port 8080) concurrently using asyncio.
"""
import asyncio
import logging

import uvicorn
from rest_server import app as fastapi_app

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

REST_PORT = 8080

async def serve_rest():
    config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=REST_PORT, log_level="info")
    server = uvicorn.Server(config)
    logger.info(f"FastAPI REST server starting on port {REST_PORT}")
    await server.serve()

async def main():
    await serve_rest()

if __name__ == "__main__":
    asyncio.run(main())
