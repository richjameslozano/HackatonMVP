"""FastAPI application entry point with CORS, lifespan, and router includes."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import webhook, ws, health
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL_SECONDS = 30


async def _heartbeat_loop() -> None:
    """Background task that pings all WebSocket connections every 30 seconds."""
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
        try:
            await manager.ping_all()
        except Exception:
            logger.exception("Error during heartbeat ping_all")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan: start heartbeat on startup, cancel on shutdown."""
    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    logger.info("Heartbeat background task started (interval=%ds)", HEARTBEAT_INTERVAL_SECONDS)
    yield
    heartbeat_task.cancel()
    try:
        await heartbeat_task
    except asyncio.CancelledError:
        pass
    logger.info("Heartbeat background task stopped")


app = FastAPI(
    title="SP Madrid Realtime Backend",
    description="Receives Lark webhooks and broadcasts real-time updates via WebSocket.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware configured from CORS_ORIGINS environment variable
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhook.router, tags=["webhook"])
app.include_router(ws.router, tags=["websocket"])
app.include_router(health.router, tags=["health"])
