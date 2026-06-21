"""Property-based tests for the tables router endpoints."""

from unittest.mock import patch

from fastapi.testclient import TestClient
from hypothesis import given, settings as hyp_settings
from hypothesis import strategies as st

from app.main import app
from app.services.cache import CacheStore
from app.services.write_queue import WriteQueue


# ─── Test Setup ─────────────────────────────────────────────────────────────

# Configure a known shared secret and table for testing
TEST_SECRET = "test-secret-token"
TEST_TABLE_ID = "tbl_test_table"


def _setup_app_state() -> tuple[CacheStore, WriteQueue]:
    """Set up app.state with fresh cache and write_queue."""
    cache = CacheStore(ttl_seconds=300, max_records=10_000)
    write_queue = WriteQueue(max_size=1000)
    app.state.cache = cache
    app.state.write_queue = write_queue
    return cache, write_queue


def auth_headers():
    """Return valid auth headers for test requests."""
    return {"Authorization": f"Bearer {TEST_SECRET}"}


# ─── Strategies ─────────────────────────────────────────────────────────────

# Strategy for generating arbitrary field dicts with string keys and simple values
field_values_strategy = st.one_of(
    st.text(min_size=0, max_size=50),
    st.integers(min_value=-1_000_000, max_value=1_000_000),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)

field_dict_strategy = st.dictionaries(
    keys=st.text(
        min_size=1,
        max_size=20,
        alphabet=st.characters(whitelist_categories=("L", "N", "Pd"), whitelist_characters="_"),
    ),
    values=field_values_strategy,
    min_size=1,
    max_size=10,
)


# ─── Property 18: Create returns temp-prefixed ID ───────────────────────────
# Feature: api-request-caching, Property 18: Create returns temp-prefixed ID


@given(fields=field_dict_strategy)
@hyp_settings(max_examples=100)
def test_create_returns_temp_prefixed_id(fields):
    """For any valid create request with arbitrary field data, the response SHALL
    contain a record_id that starts with 'temp_' and fields that match the submitted input.

    **Validates: Requirements 5.4**
    """
    _setup_app_state()

    with patch("app.routers.tables.settings") as mock_settings:
        mock_settings.api_shared_secret = TEST_SECRET
        mock_settings.configured_tables_list = [TEST_TABLE_ID]

        client = TestClient(app)
        response = client.post(
            f"/api/api/tables/{TEST_TABLE_ID}/records",
            json={"fields": fields},
            headers=auth_headers(),
        )

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )
    data = response.json()

    # record_id must start with "temp_"
    assert data["record_id"].startswith("temp_"), (
        f"Expected record_id to start with 'temp_', got: {data['record_id']}"
    )

    # fields in response must match submitted fields
    assert data["fields"] == fields, (
        f"Expected fields {fields}, got: {data['fields']}"
    )


# ─── Property 19: Update returns optimistically merged record ────────────────
# Feature: api-request-caching, Property 19: Update returns optimistically merged record


@given(
    existing_fields=field_dict_strategy,
    update_fields=field_dict_strategy,
)
@hyp_settings(max_examples=100)
def test_update_returns_optimistically_merged_record(
    existing_fields: dict,
    update_fields: dict,
) -> None:
    """For any update request with fields F applied to an existing cached record
    with fields E, the response SHALL contain fields equal to {**E, **F}
    (the merge of existing fields overwritten by submitted fields).

    **Validates: Requirements 5.5**
    """
    cache, write_queue = _setup_app_state()

    # Pre-populate cache with an existing record (fields E)
    record_id = "rec_existing_001"
    cache.set(TEST_TABLE_ID, record_id, existing_fields)

    with patch("app.routers.tables.settings") as mock_settings:
        mock_settings.api_shared_secret = TEST_SECRET
        mock_settings.configured_tables_list = [TEST_TABLE_ID]

        client = TestClient(app)
        response = client.put(
            f"/api/api/tables/{TEST_TABLE_ID}/records/{record_id}",
            json={"fields": update_fields},
            headers=auth_headers(),
        )

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )
    data = response.json()

    # The response should contain the merged fields: existing overwritten by update
    expected_fields = {**existing_fields, **update_fields}
    assert data["record_id"] == record_id
    assert data["fields"] == expected_fields
