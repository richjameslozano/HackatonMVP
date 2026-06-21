"""Write queue with per-table FIFO ordering and batch merge support."""

import time
from collections import defaultdict, deque

from app.models import DeadLetterEntry, WriteOperation


# ─── Public Interface ────────────────────────────────────────────────────────


class WriteQueue:
    """Thread-safe write queue with per-table ordering."""

    def __init__(self, max_size: int = 1000) -> None:
        self._max_size = max_size
        self._queues: dict[str, deque[WriteOperation]] = defaultdict(deque)
        self._dead_letter: list[DeadLetterEntry] = []

    def enqueue(self, operation: WriteOperation) -> bool:
        """Add an operation to the queue. Returns False if queue is full."""
        if self.size() >= self._max_size:
            return False
        self._queues[operation.table_id].append(operation)
        return True

    def drain(self, table_id: str) -> list[WriteOperation]:
        """Remove and return all operations for a table in FIFO order."""
        if table_id not in self._queues:
            return []
        ops = list(self._queues[table_id])
        self._queues[table_id].clear()
        return ops

    def size(self, table_id: str | None = None) -> int:
        """Return queue size. If table_id is None, returns total across all tables."""
        if table_id is None:
            return sum(len(q) for q in self._queues.values())
        return len(self._queues.get(table_id, deque()))

    def has_pending(self, record_id: str) -> bool:
        """Check if a record has pending write operations in the queue."""
        for q in self._queues.values():
            for op in q:
                if op.record_id == record_id:
                    return True
        return False

    def merge_updates(
        self, operations: list[WriteOperation]
    ) -> list[WriteOperation]:
        """Merge multiple updates to the same record using last-writer-wins per field.

        Operations targeting different records or create operations are passed through
        unchanged. Only update operations targeting the same record_id are merged.
        """
        # Group by (op_type, record_id)
        creates: list[WriteOperation] = []
        updates_by_record: dict[str, list[WriteOperation]] = defaultdict(list)

        for op in operations:
            if op.op_type == "create":
                creates.append(op)
            else:
                updates_by_record[op.record_id].append(op)

        merged: list[WriteOperation] = list(creates)

        for record_id, ops in updates_by_record.items():
            if len(ops) == 1:
                merged.append(ops[0])
            else:
                # Last-writer-wins per field: iterate in submission order,
                # later values overwrite earlier ones
                sorted_ops = sorted(ops, key=lambda o: o.submitted_at)
                merged_fields: dict = {}
                for op in sorted_ops:
                    merged_fields.update(op.fields)
                # Use the latest operation as the base for metadata
                latest_op = sorted_ops[-1]
                merged.append(
                    WriteOperation(
                        op_type="update",
                        table_id=latest_op.table_id,
                        record_id=record_id,
                        fields=merged_fields,
                        submitted_at=latest_op.submitted_at,
                        fail_count=max(o.fail_count for o in sorted_ops),
                    )
                )

        return merged

    def return_failed(self, operations: list[WriteOperation]) -> None:
        """Put failed operations back at the FRONT of their table queue for retry."""
        # Group by table_id to preserve relative order within each table
        by_table: dict[str, list[WriteOperation]] = defaultdict(list)
        for op in operations:
            by_table[op.table_id].append(op)

        for table_id, ops in by_table.items():
            # extendleft reverses order, so we reverse first to maintain FIFO
            existing = self._queues[table_id]
            new_deque: deque[WriteOperation] = deque(ops)
            new_deque.extend(existing)
            self._queues[table_id] = new_deque

    def move_to_dead_letter(self, operation: WriteOperation) -> None:
        """Move an operation to the dead-letter log after 3 consecutive failures."""
        entry = DeadLetterEntry(
            operation=operation,
            last_error=f"Operation failed {operation.fail_count} times",
            dead_lettered_at=time.time(),
        )
        self._dead_letter.append(entry)

    @property
    def dead_letter_entries(self) -> list[DeadLetterEntry]:
        """Access the dead-letter log for inspection."""
        return list(self._dead_letter)
