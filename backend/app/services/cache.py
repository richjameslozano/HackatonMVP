"""In-memory cache layer with TTL, LRU eviction, and stale-while-revalidate support."""

from __future__ import annotations

import time

from app.config import Settings
from app.models import CacheEntry, TableCache


# ─── Public Interface ───────────────────────────────────────────────────────


class CacheStore:
    """In-memory cache with TTL, eviction, and stale-while-revalidate support."""

    def __init__(self, ttl_seconds: int, max_records: int) -> None:
        self._ttl_seconds = ttl_seconds
        self._max_records = max_records
        self._tables: dict[str, TableCache] = {}

    def _get_table(self, table_id: str) -> TableCache:
        """Get or create the TableCache for the given table_id."""
        if table_id not in self._tables:
            self._tables[table_id] = TableCache(
                ttl_seconds=self._ttl_seconds,
                max_records=self._max_records,
            )
        return self._tables[table_id]

    def get(self, table_id: str, record_id: str) -> CacheEntry | None:
        """Retrieve a cached record by table and record ID, or None if not present."""
        table = self._tables.get(table_id)
        if table is None:
            return None
        return table.entries.get(record_id)

    def get_all(self, table_id: str) -> list[CacheEntry] | None:
        """Return all cached entries for a table, or None if the table isn't tracked."""
        table = self._tables.get(table_id)
        if table is None:
            return None
        if not table.entries:
            return None
        return list(table.entries.values())

    def set(self, table_id: str, record_id: str, fields: dict) -> None:
        """Insert or update a single record in the cache with LRU eviction."""
        table = self._get_table(table_id)

        # If record already exists, update in-place
        if record_id in table.entries:
            entry = table.entries[record_id]
            entry.fields = fields
            entry.last_refreshed_at = time.time()
            return

        # Evict oldest entry if at capacity
        if len(table.entries) >= table.max_records:
            self._evict_oldest(table)

        now = time.time()
        table.entries[record_id] = CacheEntry(
            record_id=record_id,
            fields=fields,
            inserted_at=now,
            last_refreshed_at=now,
        )

    def set_bulk(self, table_id: str, records: list[dict]) -> None:
        """Cache a list of records for full-table caching.

        Each record dict must contain a 'record_id' key and a 'fields' key.
        """
        table = self._get_table(table_id)
        now = time.time()

        for record in records:
            record_id = record["record_id"]
            fields = record["fields"]

            if record_id in table.entries:
                entry = table.entries[record_id]
                entry.fields = fields
                entry.last_refreshed_at = now
            else:
                # Evict if at capacity
                if len(table.entries) >= table.max_records:
                    self._evict_oldest(table)

                table.entries[record_id] = CacheEntry(
                    record_id=record_id,
                    fields=fields,
                    inserted_at=now,
                    last_refreshed_at=now,
                )

    def remove(self, table_id: str, record_id: str) -> None:
        """Remove a record from the cache."""
        table = self._tables.get(table_id)
        if table is not None:
            table.entries.pop(record_id, None)

    def is_fresh(self, table_id: str, record_id: str) -> bool:
        """Check if a cached record's age is less than the TTL."""
        entry = self.get(table_id, record_id)
        if entry is None:
            return False
        return not entry.is_stale(self._ttl_seconds)

    def is_table_fully_cached(self, table_id: str) -> bool:
        """Check if a table has been fully cached (all records fetched)."""
        table = self._tables.get(table_id)
        if table is None:
            return False
        return table.fully_cached

    def mark_table_fully_cached(self, table_id: str) -> None:
        """Mark a table as having all records cached."""
        table = self._get_table(table_id)
        table.fully_cached = True
        table.last_full_fetch_at = time.time()

    def has_pending_fetch(self, record_id: str) -> bool:
        """Check if a record has a pending fetch across all tables."""
        for table in self._tables.values():
            if record_id in table.pending_fetches:
                return True
        return False

    def mark_pending_fetch(self, table_id: str, record_id: str) -> None:
        """Mark a record as having a pending fetch."""
        table = self._get_table(table_id)
        table.pending_fetches.add(record_id)

    def clear_pending_fetch(self, table_id: str, record_id: str) -> None:
        """Clear the pending fetch marker for a record."""
        table = self._tables.get(table_id)
        if table is not None:
            table.pending_fetches.discard(record_id)

    def _evict_oldest(self, table: TableCache) -> None:
        """Evict the entry with the oldest last_refreshed_at timestamp."""
        if not table.entries:
            return

        oldest_id = min(
            table.entries,
            key=lambda rid: table.entries[rid].last_refreshed_at,
        )
        del table.entries[oldest_id]


# ─── Factory ────────────────────────────────────────────────────────────────


def create_cache(settings: Settings) -> CacheStore:
    """Factory function to create an initialized CacheStore."""
    return CacheStore(
        ttl_seconds=settings.cache_ttl_seconds,
        max_records=settings.cache_max_records_per_table,
    )
