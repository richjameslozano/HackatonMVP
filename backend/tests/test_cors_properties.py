# Feature: deployment-vercel, Property 2: CORS reflects exactly the configured origins
# **Validates: Requirements 6.1, 6.3**
"""
Property-based tests for CORS origin membership.

For any request origin and any comma-separated CORS_ORIGINS configuration, the
backend emits cross-origin access headers for that origin if and only if the
origin is a member of split(CORS_ORIGINS, ","). This means a listed Static Site
production origin is accepted and every unlisted origin is omitted.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from hypothesis import given, settings as hyp_settings
from hypothesis import strategies as st

from app.config import Settings


# ─── Strategies ─────────────────────────────────────────────────────────────

# A pool of clean, realistic origin strings (no commas, no surrounding
# whitespace) so that comma-joining produces an unambiguous CORS_ORIGINS value.
ORIGIN_POOL = [
    "https://hackatonmvp-frontend.onrender.com",
    "https://app.example.com",
    "https://staging.example.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://foo.bar.dev",
    "https://another-site.onrender.com",
    "http://127.0.0.1:8000",
]

origin_strategy = st.sampled_from(ORIGIN_POOL)

# A list of configured origins (possibly empty, possibly with duplicates),
# drawn from the pool.
configured_origins_strategy = st.lists(origin_strategy, min_size=0, max_size=6)


def _build_client(cors_origins_value: str) -> TestClient:
    """Build a FastAPI app whose CORS middleware mirrors app/main.py, using the
    cors_origins_list derived from the given CORS_ORIGINS string."""
    settings = Settings(cors_origins=cors_origins_value)

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/probe")
    def probe():
        return {"ok": True}

    return TestClient(app)


def _split(cors_origins_value: str) -> list[str]:
    """Reference implementation of split(CORS_ORIGINS, ",") with the same
    stripping/empty-filtering the Settings helper performs."""
    return [o.strip() for o in cors_origins_value.split(",") if o.strip()]


class TestCorsOriginMembership:
    """Property 2: CORS reflects exactly the configured origins."""

    @given(configured=configured_origins_strategy, request_origin=origin_strategy)
    @hyp_settings(max_examples=100, deadline=None)
    def test_header_emitted_iff_origin_is_member(
        self, configured: list[str], request_origin: str
    ) -> None:
        """access-control-allow-origin is present IFF the request origin is a
        member of split(CORS_ORIGINS, ",")."""
        cors_origins_value = ",".join(configured)
        client = _build_client(cors_origins_value)

        response = client.get("/probe", headers={"Origin": request_origin})

        is_member = request_origin in _split(cors_origins_value)
        header_present = "access-control-allow-origin" in response.headers

        assert header_present == is_member, (
            f"origin={request_origin!r} configured={cors_origins_value!r} "
            f"member={is_member} header_present={header_present}"
        )

        # When the origin is allowed, the reflected header must equal the origin.
        if is_member:
            assert response.headers["access-control-allow-origin"] == request_origin

    @given(configured=st.lists(origin_strategy, min_size=1, max_size=6))
    @hyp_settings(max_examples=100, deadline=None)
    def test_listed_origin_is_accepted(self, configured: list[str]) -> None:
        """A Static Site origin that IS listed in CORS_ORIGINS is accepted."""
        cors_origins_value = ",".join(configured)
        client = _build_client(cors_origins_value)

        # Pick an origin guaranteed to be in the configured list.
        listed_origin = configured[0]
        response = client.get("/probe", headers={"Origin": listed_origin})

        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == listed_origin

    @given(
        configured=configured_origins_strategy,
        request_origin=origin_strategy,
    )
    @hyp_settings(max_examples=100, deadline=None)
    def test_unlisted_origin_is_omitted(
        self, configured: list[str], request_origin: str
    ) -> None:
        """An origin NOT listed in CORS_ORIGINS has its cross-origin headers
        omitted."""
        # Exclude the request origin from the configured set so it is unlisted.
        filtered = [o for o in configured if o != request_origin]
        cors_origins_value = ",".join(filtered)
        client = _build_client(cors_origins_value)

        response = client.get("/probe", headers={"Origin": request_origin})

        assert "access-control-allow-origin" not in response.headers

