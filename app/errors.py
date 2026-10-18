# app/errors.py
"""The CONTRACT.md section 3 error table, as one class.

Every error response in MENGER is exactly the CONTRACT.md section 1 `Error` shape. No
endpoint returns a bare string, and no endpoint invents a code: the table below IS the
contract's table, same codes, same HTTP statuses, in the same order.
"""
from typing import Any, Dict, Optional


class MengerError(Exception):
    """A contract-shaped error. `http` and `code` always travel together."""

    def __init__(
        self,
        http: int,
        code: str,
        message: str,
        field: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.http = http
        self.code = code
        self.message = message
        self.field = field
        self.detail = detail or {}

    def body(self) -> Dict[str, Any]:
        """The exact CONTRACT.md section 1 Error envelope. `field` null when not scoped,
        `detail` {} when empty."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "field": self.field,
                "detail": self.detail,
            }
        }

    # --- the table, one constructor per row -------------------------------

    @staticmethod
    def validation(message: str, field: Optional[str] = None) -> "MengerError":
        # 400 VALIDATION_ERROR — malformed JSON, missing field, wrong type, empty string
        return MengerError(400, "VALIDATION_ERROR", message, field)

    @staticmethod
    def no_sources() -> "MengerError":
        # 400 NO_SOURCES — a claim with no provenance cannot be scored. This is a DISTINCT
        # code from VALIDATION_ERROR because it is a semantic refusal, not a shape problem.
        return MengerError(
            400,
            "NO_SOURCES",
            "sources must contain at least one source id — a claim with no provenance cannot be scored",
            "sources",
        )

    @staticmethod
    def slot_not_found(slot_key: str) -> "MengerError":
        return MengerError(
            404, "SLOT_NOT_FOUND", f"no slot matches {slot_key!r}", "key", {"slot_key": slot_key}
        )

    @staticmethod
    def receipt_not_found(receipt_id: str) -> "MengerError":
        return MengerError(
            404,
            "RECEIPT_NOT_FOUND",
            f"no receipt matches {receipt_id!r}",
            "receipt_id",
            {"receipt_id": receipt_id},
        )

    @staticmethod
    def review_not_found(review_id: str) -> "MengerError":
        # Reserved by CONTRACT.md section 3. v1.0 has no /review/{id} route, so nothing
        # raises this today. It exists so that adding the route cannot invent a new code.
        return MengerError(
            404,
            "REVIEW_NOT_FOUND",
            f"no review matches {review_id!r}",
            "review_id",
            {"review_id": review_id},
        )

    @staticmethod
    def replay_mismatch(label: str, reason: str) -> "MengerError":
        # 409 — ONLY when a recorded statement fails to EXECUTE. A changed numeric result is
        # not a mismatch error: it is reported in the 200 body as `divergence` (section 9.5).
        return MengerError(
            409,
            "REPLAY_MISMATCH",
            f"recorded statement {label!r} failed to execute on replay: {reason}",
            None,
            {"label": label, "reason": reason},
        )

    @staticmethod
    def unknown_agent(agent_id: str) -> "MengerError":
        return MengerError(
            422,
            "UNKNOWN_AGENT",
            f"agent {agent_id!r} is not in the graph",
            "agent_id",
            {"unknown": [agent_id]},
        )

    @staticmethod
    def unknown_source(unknown: list) -> "MengerError":
        # CONTRACT.md section 3: "offenders in detail.unknown"
        return MengerError(
            422,
            "UNKNOWN_SOURCE",
            f"source(s) not in the graph: {', '.join(unknown)}",
            "sources",
            {"unknown": list(unknown)},
        )

    @staticmethod
    def rate_limited(retry_after_s: int) -> "MengerError":
        # Reserved for the deployed instance. Nothing raises it locally; the constructor
        # exists so the deployed build cannot invent a different shape.
        return MengerError(
            429, "RATE_LIMITED", "too many requests", None, {"retry_after_s": retry_after_s}
        )

    @staticmethod
    def engine_unavailable(reason: str) -> "MengerError":
        return MengerError(
            503, "ENGINE_UNAVAILABLE", f"FalkorDB command failed: {reason}", None, {}
        )

    @staticmethod
    def boot_assertion_failed(message: str, boot_checks: Dict[str, Any]) -> "MengerError":
        # AF-16: the service refuses to serve rather than serve a wrong headline number.
        return MengerError(
            503, "BOOT_ASSERTION_FAILED", message, None, {"boot_checks": boot_checks}
        )
