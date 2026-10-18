# app/schema.py
"""Pydantic models mirroring CONTRACT.md section 1 and section 2, field for field.

Scope note: these models are used for REQUEST validation and for documenting the response
shapes. The response bodies themselves are assembled as plain dicts by app/api.py via the
projection in section 9, because several of them (receipts, subgraphs) are reconstructed from
stored JSON and a round trip through a model would add no checking that the projection does
not already do — while making a field-ordering difference between a freshly computed receipt
and a replayed one possible. Request validation is where Pydantic earns its place:
CONTRACT.md 400 VALIDATION_ERROR is entirely Pydantic's output, reshaped in section 11.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Verdict = Literal["ALLOW", "BLOCK", "UNDECIDED"]
ClaimStatus = Literal["ADMITTED", "REFUSED", "QUEUED", "SEEDED"]

# CONTRACT.md section 2.1: the mapping is total and fixed.
VERDICT_TO_STATUS = {"ALLOW": "ADMITTED", "BLOCK": "REFUSED", "UNDECIDED": "QUEUED"}


class RememberRequest(BaseModel):
    """CONTRACT.md section 2.1 request body. `slot_key` is DERIVED, never supplied."""

    agent_id: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    predicate: str = Field(min_length=1)
    object: str = Field(min_length=1)
    sources: List[str]
    asserted_at: Optional[str] = None

    @field_validator("agent_id", "subject", "predicate", "object")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        # CONTRACT.md section 3: "empty string" is a VALIDATION_ERROR. min_length=1 does not
        # catch "   ", so strip-and-check as well.
        if not v.strip():
            raise ValueError("must not be blank")
        return v

    @field_validator("sources")
    @classmethod
    def _sources_shape(cls, v: List[str]) -> List[str]:
        # An EMPTY list is NO_SOURCES (400, its own code), not VALIDATION_ERROR, so it is
        # NOT rejected here — api.py checks emptiness first and raises the right code
        # (section 11). Only the per-element shape is enforced here.
        for i, s in enumerate(v):
            if not isinstance(s, str) or not s.strip():
                raise ValueError(f"sources[{i}] must be a non-empty string")
        # De-duplicate while preserving order: citing the same source twice is not an error,
        # and it must not create two CITED edges, because that would be indistinguishable in
        # the graph from two genuine citations. Independence is unaffected either way (the
        # SPLIT edge caps the source at one unit) but the receipt should be honest.
        seen, out = set(), []
        for s in v:
            if s not in seen:
                seen.add(s)
                out.append(s)
        return out

    def slot_key(self) -> str:
        """CONTRACT.md section 2.1: slot_key = subject + "|" + predicate."""
        return f"{self.subject}|{self.predicate}"


class Components(BaseModel):
    """CONTRACT.md section 1 `Components`. Five fields, ALWAYS all five, never blended.

    `independence` is an int and `path_weight` is surfaced raw beside `reliability` so the
    AF-3 hop-count trap is auditable from the response alone (CONTRACT.md section 0 rule 7).
    """

    independence: int
    reliability: float
    recency: float
    path_weight: Optional[float]   # null when the claim has NO provenance chain (P29)
    age_hours: float


class SourceRef(BaseModel):
    """CONTRACT.md section 1 `ScoredClaim.sources[]`."""

    source_id: str
    kind: str
    trust: float
    is_origin: bool


class ScoredClaim(BaseModel):
    """CONTRACT.md section 1 `ScoredClaim`. `score_is_ordinal` is ALWAYS true."""

    claim_id: str
    object: str
    agent_id: Optional[str]
    agent_name: Optional[str]
    asserted_at: str
    status: ClaimStatus
    components: Components
    score: float
    score_is_ordinal: bool = True
    sources: List[SourceRef]


class RememberResponse(BaseModel):
    """CONTRACT.md section 2.1 response. `recorded` is ALWAYS true: a refused write is
    recorded, never dropped (CONTRACT.md section 0 rule 4)."""

    verdict: Verdict
    slot_key: str
    claim_id: str
    status: ClaimStatus
    recorded: bool = True
    decided_at: str
    margin: float
    epsilon: float
    score_is_ordinal: bool = True
    incoming: ScoredClaim
    incumbent: Optional[ScoredClaim]
    receipt_id: str
    review_id: Optional[str]
