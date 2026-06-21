"""Server-side Lark Base API client with token caching and retry."""

import json
import time

import httpx

from app.config import Settings


# ─── Lark API Client ────────────────────────────────────────────────────────


class LarkClient:
    """Server-side Lark Base API client with token caching."""

    def __init__(self, settings: Settings) -> None:
        self._app_id = settings.lark_app_id
        self._app_secret = settings.lark_app_secret
        self._app_token = settings.lark_base_app_token
        self._base_url = settings.lark_base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=10.0)

        # Token cache
        self._tenant_token: str | None = None
        self._token_expires_at: float = 0.0

    # ─── Token Management ───────────────────────────────────────────────────

    async def _ensure_token(self) -> str:
        """Acquire or return cached tenant access token.

        Refreshes the token when it's expired or within 60s of expiry.
        """
        now = time.time()
        if self._tenant_token and now < self._token_expires_at:
            return self._tenant_token

        url = f"{self._base_url}/auth/v3/tenant_access_token/internal"
        payload = {
            "app_id": self._app_id,
            "app_secret": self._app_secret,
        }

        resp = await self._client.post(url, json=payload)
        resp.raise_for_status()

        data = resp.json()
        self._tenant_token = data["tenant_access_token"]
        # Apply 60s buffer before actual expiry
        expire_seconds = data.get("expire", 7200)
        self._token_expires_at = now + expire_seconds - 60

        return self._tenant_token

    async def _headers(self) -> dict[str, str]:
        """Build authorization headers with a valid tenant token."""
        token = await self._ensure_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ─── URL Helpers ────────────────────────────────────────────────────────

    def _records_url(self, table_id: str) -> str:
        """Base URL for records endpoints."""
        return (
            f"{self._base_url}/bitable/v1/apps/{self._app_token}"
            f"/tables/{table_id}/records"
        )

    # ─── Public API ─────────────────────────────────────────────────────────

    async def get_record(self, table_id: str, record_id: str) -> dict | None:
        """Fetch a single record by ID. Returns None if not found (404)."""
        url = f"{self._records_url(table_id)}/{record_id}"
        headers = await self._headers()

        resp = await self._client.get(url, headers=headers, timeout=10.0)

        if resp.status_code == 404:
            return None

        if resp.status_code >= 500:
            resp.raise_for_status()

        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("record")

    async def list_records(
        self,
        table_id: str,
        filter: dict | None = None,
        sort: list[dict] | None = None,
    ) -> list[dict]:
        """Fetch all records with optional filter/sort, handling pagination."""
        url = self._records_url(table_id)
        headers = await self._headers()

        params: dict[str, str] = {}
        if filter:
            params["filter"] = json.dumps(filter)
        if sort:
            params["sort"] = json.dumps(sort)

        all_records: list[dict] = []
        page_token: str | None = None

        while True:
            request_params = {**params}
            if page_token:
                request_params["page_token"] = page_token

            resp = await self._client.get(
                url, headers=headers, params=request_params, timeout=10.0
            )

            if resp.status_code >= 500:
                resp.raise_for_status()

            resp.raise_for_status()
            data = resp.json().get("data", {})

            items = data.get("items", [])
            all_records.extend(items)

            if not data.get("has_more", False):
                break

            page_token = data.get("page_token")
            if not page_token:
                break

        return all_records

    async def batch_create(
        self, table_id: str, records: list[dict]
    ) -> list[dict]:
        """Batch create records. Returns the list of created records."""
        url = f"{self._records_url(table_id)}/batch_create"
        headers = await self._headers()

        body = {"records": [{"fields": r} for r in records]}

        resp = await self._client.post(
            url, headers=headers, json=body, timeout=10.0
        )

        if resp.status_code >= 500:
            resp.raise_for_status()

        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("records", [])

    async def batch_update(
        self, table_id: str, records: list[dict]
    ) -> list[dict]:
        """Batch update records. Each record dict must have record_id and fields."""
        url = f"{self._records_url(table_id)}/batch_update"
        headers = await self._headers()

        body = {
            "records": [
                {"record_id": r["record_id"], "fields": r["fields"]}
                for r in records
            ]
        }

        resp = await self._client.post(
            url, headers=headers, json=body, timeout=10.0
        )

        if resp.status_code >= 500:
            resp.raise_for_status()

        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("records", [])

    # ─── Lifecycle ──────────────────────────────────────────────────────────

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()
