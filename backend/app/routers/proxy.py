"""Reverse proxy for the Lark Open API to avoid browser CORS in production.

The deployed SPA is served from a different origin than ``open.larksuite.com``
and Lark's API endpoints do not return CORS headers for browser origins. In
development this is solved by the Vite dev-server proxy (``/lark-api``); in
production the SPA instead calls this same-backend proxy (whose origin is
already allowed by the backend CORS config) and the proxy forwards the request
to Lark server-side, where CORS does not apply.
"""

import httpx
from fastapi import APIRouter, Request, Response

router = APIRouter()

LARK_API_BASE = "https://open.larksuite.com/open-apis"

# Request headers that must not be forwarded upstream (hop-by-hop, host, or
# headers httpx/Lark should compute themselves).
_EXCLUDED_REQUEST_HEADERS = {
    "host",
    "content-length",
    "connection",
    "accept-encoding",
    "origin",
    "referer",
}

# Response headers that must not be passed back verbatim (re-computed by the
# ASGI server / would corrupt the response if forwarded).
_EXCLUDED_RESPONSE_HEADERS = {
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
}

_PROXY_TIMEOUT_SECONDS = 30.0


@router.api_route(
    "/lark-api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_lark(path: str, request: Request) -> Response:
    """Forward a request under ``/lark-api/*`` to the Lark Open API.

    Method, query string, body, and relevant headers (including the
    ``Authorization`` bearer token) are preserved. The upstream response is
    returned as-is; CORS headers are added by the app's CORSMiddleware on the
    way out.
    """
    url = f"{LARK_API_BASE}/{path}"

    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _EXCLUDED_REQUEST_HEADERS
    }
    body = await request.body()

    async with httpx.AsyncClient(timeout=_PROXY_TIMEOUT_SECONDS) as client:
        upstream = await client.request(
            method=request.method,
            url=url,
            params=request.query_params,
            headers=forward_headers,
            content=body,
        )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in _EXCLUDED_RESPONSE_HEADERS
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
