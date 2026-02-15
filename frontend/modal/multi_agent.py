"""Multi-agent orchestrator for clone-to-clone collaboration."""
import time

MAX_HOPS = 2
MAX_CONSULTS = 3
TIMEOUT_SECONDS = 15


class ConsultationRequest:
    def __init__(self, caller_clone_id, target_clone_id, query, depth=0, conversation_id=""):
        self.caller_clone_id = caller_clone_id
        self.target_clone_id = target_clone_id
        self.query = query
        self.depth = depth
        self.conversation_id = conversation_id


class ConsultationResult:
    def __init__(self, target_clone_id, target_clone_name, query, response, latency_ms, depth):
        self.target_clone_id = target_clone_id
        self.target_clone_name = target_clone_name
        self.query = query
        self.response = response
        self.latency_ms = latency_ms
        self.depth = depth


def can_consult(depth, consult_count):
    if depth >= MAX_HOPS:
        return False, f"Max depth ({MAX_HOPS}) reached"
    if consult_count >= MAX_CONSULTS:
        return False, f"Max consultations ({MAX_CONSULTS}) reached"
    return True, None


def orchestrate_consultation(request, clone_registry, run_clone_fn):
    start_time = time.time()

    allowed, reason = can_consult(request.depth, 0)
    if not allowed:
        return ConsultationResult(
            request.target_clone_id, "Unknown", request.query,
            f"Consultation not allowed: {reason}",
            int((time.time() - start_time) * 1000), request.depth,
        )

    target_clone = clone_registry.get(request.target_clone_id)
    if not target_clone:
        return ConsultationResult(
            request.target_clone_id, "Unknown", request.query,
            "Target clone not found",
            int((time.time() - start_time) * 1000), request.depth,
        )

    try:
        result = run_clone_fn(
            clone_id=request.target_clone_id,
            message=request.query,
            system_prompt=target_clone.get("system_prompt", ""),
            conversation_history=[],
        )
        return ConsultationResult(
            request.target_clone_id, target_clone.get("name", "Unknown"),
            request.query, result.get("response", "No response"),
            int((time.time() - start_time) * 1000), request.depth + 1,
        )
    except Exception as e:
        return ConsultationResult(
            request.target_clone_id, target_clone.get("name", "Unknown"),
            request.query, f"Consultation failed: {str(e)}",
            int((time.time() - start_time) * 1000), request.depth,
        )
