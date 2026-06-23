"""FastAPI application entry point with CORS, lifespan, and router includes."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import webhook, ws, health, tables, proxy
from app.services.cache import create_cache
from app.services.connection_manager import manager
from app.services.flush_scheduler import FlushScheduler
from app.services.lark_client import LarkClient
from app.services.webhook_invalidator import WebhookInvalidator
from app.services.write_queue import WriteQueue

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
    """Manage application lifespan: start services on startup, clean up on shutdown."""
    # ─── Heartbeat ───────────────────────────────────────────────────────────
    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    logger.info("Heartbeat background task started (interval=%ds)", HEARTBEAT_INTERVAL_SECONDS)

    # ─── Cache & Services ────────────────────────────────────────────────────
    cache = create_cache(settings)
    write_queue = WriteQueue(max_size=settings.write_queue_max_size)
    lark_client = LarkClient(settings)
    flush_scheduler = FlushScheduler(
        queue=write_queue,
        cache=cache,
        lark_client=lark_client,
        settings=settings,
        ws_manager=manager,
    )
    webhook_invalidator = WebhookInvalidator(
        cache=cache,
        queue=write_queue,
        lark_client=lark_client,
        ws_manager=manager,
    )

    # Store services on app.state for access from routers
    app.state.cache = cache
    app.state.write_queue = write_queue
    app.state.lark_client = lark_client
    app.state.flush_scheduler = flush_scheduler
    app.state.webhook_invalidator = webhook_invalidator

    # Start flush scheduler
    await flush_scheduler.start()

    # Subscribe to Lark Base doc events so we receive record change webhooks
    if settings.lark_base_app_token:
        subscribed = await lark_client.subscribe_to_doc_events(settings.lark_base_app_token)
        if subscribed:
            logger.info("Subscribed to Lark Base doc events for token=%s", settings.lark_base_app_token)
        else:
            logger.warning("Failed to subscribe to Lark Base doc events — webhooks may not arrive")

    logger.info(
        "Cache TTL=%ds, Flush interval=%ds",
        settings.cache_ttl_seconds,
        settings.batch_flush_interval_seconds,
    )

    yield

    # ─── Shutdown ────────────────────────────────────────────────────────────
    await flush_scheduler.stop()
    await lark_client.close()

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
app.include_router(tables.router, tags=["tables"])
app.include_router(proxy.router, tags=["proxy"])
