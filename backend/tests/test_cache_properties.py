# Feature: api-request-caching, Property 6: Cache eviction at capacity
# **Validates: Requirements 1.7**
"""
Property-based tests for CacheStore eviction behavior.

Tests that for any table cache containing exactly max_records records,
inserting an additional record SHALL evict the record with the greatest age
(oldest last_refreshed_at), maintaining the invariant that record count
never exceeds max_records.
"""

import time
from unittest.mock import patch

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.services.cache import CacheStore


# ─── Strategies ─────────────────────────────────────────────────────────────

# Small max_records for practical testing speed
max_records_strategy = st.integers(min_value=5, max_value=20)

# Strategy for generating a record's fields (simple dict)
fields_strategy = st.dictionaries(
    keys=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L", "N"))),
    values=st.text(min_size=1, max_size=20),
    min_size=1,
    max_size=5,
)

# Strategy for record IDs
record_id_strategy = st.text(
    min_size=1, max_size=15,
    alphabet=st.characters(whitelist_categories=("L", "N")),
)


class TestCacheEvictionAtCapacity:
    """Property 6: Cache eviction at capacity.

    For any table cache containing exactly max_records records, inserting an
    additional record SHALL evict the record with the greatest age (oldest
    last_refreshed_at), maintaining the invariant that record count never
    exceeds max_records.
    """

    @given(
        max_records=max_records_strategy,
        table_id=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L",))),
        extra_fields=fields_strategy,
    )
    @settings(max_examples=100)
    def test_eviction_maintains_max_records_invariant(
        self, max_records: int, table_id: str, extra_fields: dict
    ) -> None:
        """Inserting beyond capacity never exceeds max_records count."""
        cache = CacheStore(ttl_seconds=300, max_records=max_records)

        # Fill cache to exactly max_records with distinct records
        base_time = 1000000.0
        for i in range(max_records):
            # Each record gets a different last_refreshed_at so we know which is oldest
            with patch("time.time", return_value=base_time + i):
                cache.set(table_id, f"record_{i}", {"value": i})

        # Verify we're at capacity
        entries = cache.get_all(table_id)
        assert entries is not None
        assert len(entries) == max_records

        # Insert one more record
        extra_record_id = f"extra_record_{max_records}"
        with patch("time.time", return_value=base_time + max_records):
            cache.set(table_id, extra_record_id, extra_fields)

        # Verify count doesn't exceed max_records
        entries_after = cache.get_all(table_id)
        assert entries_after is not None
        assert len(entries_after) <= max_records

    @given(
        max_records=max_records_strategy,
        table_id=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L",))),
        extra_fields=fields_strategy,
    )
    @settings(max_examples=100)
    def test_eviction_removes_oldest_record(
        self, max_records: int, table_id: str, extra_fields: dict
    ) -> None:
        """The evicted record is the one with the oldest last_refreshed_at."""
        cache = CacheStore(ttl_seconds=300, max_records=max_records)

        # Fill cache to capacity. record_0 gets the oldest timestamp.
        base_time = 1000000.0
        for i in range(max_records):
            with patch("time.time", return_value=base_time + i):
                cache.set(table_id, f"record_{i}", {"value": i})

        # The oldest record is record_0 (last_refreshed_at = base_time + 0)
        oldest_entry = cache.get(table_id, "record_0")
        assert oldest_entry is not None

        # Insert one more record (newer timestamp)
        extra_record_id = f"extra_record_{max_records}"
        with patch("time.time", return_value=base_time + max_records):
            cache.set(table_id, extra_record_id, extra_fields)

        # The oldest record should have been evicted
        evicted_entry = cache.get(table_id, "record_0")
        assert evicted_entry is None

        # The new record should be present
        new_entry = cache.get(table_id, extra_record_id)
        assert new_entry is not None
        assert new_entry.fields == extra_fields

    @given(
        max_records=max_records_strategy,
        table_id=st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=("L",))),
        num_extra=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=100)
    def test_multiple_insertions_beyond_capacity_maintain_invariant(
        self, max_records: int, table_id: str, num_extra: int
    ) -> None:
        """Multiple insertions beyond capacity still maintain max_records invariant."""
        cache = CacheStore(ttl_seconds=300, max_records=max_records)

        # Fill cache to capacity
        base_time = 1000000.0
        for i in range(max_records):
            with patch("time.time", return_value=base_time + i):
                cache.set(table_id, f"record_{i}", {"value": i})

        # Insert multiple additional records beyond capacity
        for j in range(num_extra):
            with patch("time.time", return_value=base_time + max_records + j):
                cache.set(table_id, f"extra_{j}", {"extra": j})

        # Invariant: count never exceeds max_records
        entries = cache.get_all(table_id)
        assert entries is not None
        assert len(entries) <= max_records

        # The most recently inserted records should be present
        latest = cache.get(table_id, f"extra_{num_extra - 1}")
        assert latest is not None


# ─── Property 3: Fresh records served from cache without API calls ──────────
# Feature: api-request-caching, Property 3: Fresh records served from cache without API calls
# **Validates: Requirements 1.4, 2.1, 8.1**
#
# For any cached record whose age is less than its table's TTL, a read request
# for that record SHALL return the cached data without making any Lark Base API
# call. We test: insert record, immediately check is_fresh() returns True and
# get() returns the record with correct fields.


# Strategy for field values (JSON-like)
_fresh_field_values = st.one_of(
    st.text(max_size=100),
    st.integers(min_value=-1_000_000, max_value=1_000_000),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)
_fresh_fields_strategy = st.dictionaries(
    keys=st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("L", "N"))),
    values=_fresh_field_values,
    min_size=1,
    max_size=10,
)


class TestFreshRecordsServedFromCache:
    """Property 3: Fresh records served from cache without API calls.

    For any cached record whose age is less than its table's TTL, a read
    request for that record SHALL return the cached data without making any
    Lark Base API call.
    """

    @given(
        table_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N", "P"))),
        record_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N", "P"))),
        fields=_fresh_fields_strategy,
        ttl=st.integers(min_value=10, max_value=86400),
    )
    @settings(max_examples=100)
    def test_fresh_record_is_served_from_cache(
        self, table_id: str, record_id: str, fields: dict, ttl: int
    ) -> None:
        """A freshly inserted record is always fresh and returned correctly.

        Since we just inserted the record, its age is effectively 0 which is
        always less than any positive TTL. Therefore is_fresh() must be True
        and get() must return the exact same fields — no external API call needed.
        """
        # Arrange: create a CacheStore with the given TTL
        cache = CacheStore(ttl_seconds=ttl, max_records=10_000)

        # Act: insert a record into the cache
        cache.set(table_id, record_id, fields)

        # Assert: the record is fresh (age < TTL)
        assert cache.is_fresh(table_id, record_id) is True

        # Assert: get() returns the cached entry with correct fields
        entry = cache.get(table_id, record_id)
        assert entry is not None
        assert entry.record_id == record_id
        assert entry.fields == fields

        # Assert: the entry reports itself as not stale
        assert entry.is_stale(ttl) is False
