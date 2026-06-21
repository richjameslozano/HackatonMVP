"""Property-based tests for the WriteQueue service."""

import time
from hypothesis import given, settings
from hypothesis import strategies as st

from app.models import WriteOperation
from app.services.write_queue import WriteQueue


# ─── Strategies ──────────────────────────────────────────────────────────────

# Strategy for generating field names (simple alphanumeric keys)
field_name_st = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_"),
    min_size=1,
    max_size=10,
)

# Strategy for generating field values (strings, ints, floats, bools)
field_value_st = st.one_of(
    st.text(min_size=0, max_size=20),
    st.integers(min_value=-1000, max_value=1000),
    st.floats(allow_nan=False, allow_infinity=False),
    st.booleans(),
)

# Strategy for generating a fields dict (1 to 5 fields)
fields_st = st.dictionaries(field_name_st, field_value_st, min_size=1, max_size=5)


# ─── Property 9: Last-writer-wins field merge ────────────────────────────────
# Feature: api-request-caching, Property 9: Last-writer-wins field merge


@given(
    field_updates=st.lists(
        fields_st,
        min_size=2,
        max_size=10,
    )
)
@settings(max_examples=100)
def test_last_writer_wins_field_merge(field_updates: list[dict]) -> None:
    """For any sequence of update operations targeting the same record,
    merging them SHALL produce a single update where each field's value
    equals the value from the most recently submitted operation that
    modifies that field.

    **Validates: Requirements 3.4**
    """
    queue = WriteQueue()
    table_id = "tbl_test"
    record_id = "rec_target"

    # Create operations with strictly increasing timestamps
    base_time = 1000.0
    operations: list[WriteOperation] = []
    for i, fields in enumerate(field_updates):
        op = WriteOperation(
            op_type="update",
            table_id=table_id,
            record_id=record_id,
            fields=fields,
            submitted_at=base_time + i,
        )
        operations.append(op)

    # Merge the updates
    merged = queue.merge_updates(operations)

    # Should produce exactly one merged operation for the single record
    assert len(merged) == 1
    merged_op = merged[0]

    # Verify it's an update for the correct record
    assert merged_op.op_type == "update"
    assert merged_op.record_id == record_id
    assert merged_op.table_id == table_id

    # Compute expected last-writer-wins result manually:
    # Iterate in submission order, later values overwrite earlier ones
    expected_fields: dict = {}
    for fields in field_updates:
        expected_fields.update(fields)

    # Each field's value should equal the value from the most recently
    # submitted operation that modifies that field
    assert merged_op.fields == expected_fields

    # The merged operation should use the latest timestamp
    assert merged_op.submitted_at == base_time + len(field_updates) - 1
