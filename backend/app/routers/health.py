"""Health check router returning connection count and server uptime."""

import time

from fastapi import APIRouter

from app.services.connection_manager import manager

router = APIRouter()

start_time = time.time()


@router.get("/health")
async def health_check() -> dict:
    """Returns connection count and server uptime."""
    return {
        "status": "ok",
        "connections": manager.get_connection_count(),
        "uptime_seconds": time.time() - start_time,
    }
