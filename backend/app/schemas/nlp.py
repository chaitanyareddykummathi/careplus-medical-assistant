from pydantic import BaseModel, Field


class NLPAnalyzeRequest(BaseModel):
    text: str = Field(min_length=3, max_length=5000)
    top_k: int = Field(default=3, ge=1, le=10)


class EntityResult(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: float


class RetrievalResult(BaseModel):
    chunk_id: int
    title: str
    source: str | None
    score: float


class NLPDecisionResult(BaseModel):
    escalation_required: bool
    triage_level: str
    action: str
    rationale: str
    policy_version: str


class NLPAnalyzeResponse(BaseModel):
    normalized_text: str
    intent: str
    risk_level: str
    risk_score: float
    entities: list[EntityResult]
    retrieved_context: list[RetrievalResult]
    decision: NLPDecisionResult
    model_versions: dict[str, str] | None = None
