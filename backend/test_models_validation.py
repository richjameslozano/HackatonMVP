"""Quick validation script for Pydantic models."""
import sys
sys.path.insert(0, ".")
from app.models import (
    LarkWebhookPayload,
    EventMessage,
    LeaderboardUpdatePayload,
    QuestUpdatePayload,
    BadgeUpdatePayload,
    ConnectionAckPayload,
)
from pydantic import ValidationError

passed = 0
failed = 0


def check(name, condition):
    global passed, failed
    if condition:
        print(f"  PASS: {name}")
        passed += 1
    else:
        print(f"  FAIL: {name}")
        failed += 1


# badge_count >= 0
try:
    LeaderboardUpdatePayload(member_id="m1", badge_count=-1)
    check("badge_count >= 0 enforced", False)
except ValidationError:
    check("badge_count >= 0 enforced", True)

# badge_count = 0 is valid
try:
    lp = LeaderboardUpdatePayload(member_id="m1", badge_count=0)
    check("badge_count = 0 accepted", lp.badge_count == 0)
except ValidationError:
    check("badge_count = 0 accepted", False)

# badge_name min_length=1
try:
    BadgeUpdatePayload(member_id="m1", badge_id="b1", badge_name="")
    check("badge_name min_length=1 enforced", False)
except ValidationError:
    check("badge_name min_length=1 enforced", True)

# badge_name max_length=100
try:
    BadgeUpdatePayload(member_id="m1", badge_id="b1", badge_name="x" * 101)
    check("badge_name max_length=100 enforced", False)
except ValidationError:
    check("badge_name max_length=100 enforced", True)

# badge_name valid
try:
    bp = BadgeUpdatePayload(member_id="m1", badge_id="b1", badge_name="Good Badge")
    check("valid badge_name accepted", bp.badge_name == "Good Badge")
except ValidationError:
    check("valid badge_name accepted", False)

# new_status enum
try:
    QuestUpdatePayload(quest_id="q1", new_status="invalid", affected_member_id="m1", proposer_id="p1", target_role="agent", assignment_type="all", completion_mode="multiple")
    check("new_status enum enforced", False)
except ValidationError:
    check("new_status enum enforced", True)

# target_role enum
try:
    QuestUpdatePayload(quest_id="q1", new_status="active", affected_member_id="m1", proposer_id="p1", target_role="invalid", assignment_type="all", completion_mode="multiple")
    check("target_role enum enforced", False)
except ValidationError:
    check("target_role enum enforced", True)

# assignment_type enum
try:
    QuestUpdatePayload(quest_id="q1", new_status="active", affected_member_id="m1", proposer_id="p1", target_role="agent", assignment_type="invalid", completion_mode="multiple")
    check("assignment_type enum enforced", False)
except ValidationError:
    check("assignment_type enum enforced", True)

# completion_mode enum
try:
    QuestUpdatePayload(quest_id="q1", new_status="active", affected_member_id="m1", proposer_id="p1", target_role="agent", assignment_type="all", completion_mode="invalid")
    check("completion_mode enum enforced", False)
except ValidationError:
    check("completion_mode enum enforced", True)

# Valid QuestUpdatePayload with rejection_reason
try:
    qp = QuestUpdatePayload(quest_id="q1", new_status="rejected", affected_member_id="m1", proposer_id="p1", target_role="developer", assignment_type="open", completion_mode="first-claim", rejection_reason="Not aligned")
    check("valid QuestUpdatePayload with rejection_reason", qp.rejection_reason == "Not aligned")
except ValidationError:
    check("valid QuestUpdatePayload with rejection_reason", False)

# Valid QuestUpdatePayload without rejection_reason
try:
    qp = QuestUpdatePayload(quest_id="q1", new_status="active", affected_member_id="m1", proposer_id="p1", target_role="all", assignment_type="assigned", completion_mode="multiple")
    check("valid QuestUpdatePayload without rejection_reason", qp.rejection_reason is None)
except ValidationError:
    check("valid QuestUpdatePayload without rejection_reason", False)

# EventMessage type enum
try:
    EventMessage(type="invalid_type", payload={}, timestamp="2024-01-15T10:30:00Z")
    check("EventMessage type enum enforced", False)
except ValidationError:
    check("EventMessage type enum enforced", True)

# Valid EventMessage
try:
    em = EventMessage(type="leaderboard_update", payload={"member_id": "m1", "badge_count": 5}, timestamp="2024-01-15T10:30:00Z")
    check("valid EventMessage accepted", em.type == "leaderboard_update")
except ValidationError:
    check("valid EventMessage accepted", False)

# ConnectionAckPayload
try:
    cap = ConnectionAckPayload(connection_id="conn-123")
    check("valid ConnectionAckPayload", cap.connection_id == "conn-123")
except ValidationError:
    check("valid ConnectionAckPayload", False)

# LarkWebhookPayload defaults
lwp = LarkWebhookPayload()
check("LarkWebhookPayload defaults", lwp.token == "" and lwp.type == "" and lwp.challenge == "" and lwp.event == {})

# LarkWebhookPayload with values
lwp2 = LarkWebhookPayload(token="t", type="event_callback", challenge="ch", event={"table_id": "tbl1"})
check("LarkWebhookPayload with values", lwp2.token == "t" and lwp2.event == {"table_id": "tbl1"})

print(f"\nResults: {passed} passed, {failed} failed")
if failed > 0:
    sys.exit(1)
