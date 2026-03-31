import hashlib
import logging
from collections import defaultdict

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.models.health import AnalysisJob
from app.models.symptom import SymptomRecord
from app.schemas.nlp import NLPAnalyzeResponse
from app.core.observability import traced_span
from app.nlp.pipeline import nlp_pipeline
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class NLPService:
    def analyze_many_for_jobs(self, db: Session, jobs: list[AnalysisJob]) -> dict[int, NLPAnalyzeResponse]:
        responses: dict[int, NLPAnalyzeResponse] = {}
        grouped_jobs: dict[int, list[AnalysisJob]] = defaultdict(list)

        for job in jobs:
            text = str(job.payload.get('text', ''))
            top_k = int(job.payload.get('top_k', 3))

            cache_key = self._cache_key(user_id=job.user_id, text=text, top_k=top_k)
            cached = cache_service.get_json(cache_key)
            if cached:
                response = NLPAnalyzeResponse(**cached)
                responses[job.id] = response
                self._log_audit_event(job_id=job.id, user_id=job.user_id, response=response)
                continue

            grouped_jobs[top_k].append(job)

        for top_k, jobs_for_top_k in grouped_jobs.items():
            raw_texts = [str(job.payload.get('text', '')) for job in jobs_for_top_k]
            with traced_span(
                'nlp.analysis.batch.execute',
                {'batch_size': len(raw_texts), 'top_k': top_k},
            ):
                batch_results = nlp_pipeline.analyze_batch(db=db, raw_texts=raw_texts, top_k=top_k)

            for job, result in zip(jobs_for_top_k, batch_results):
                text = str(job.payload.get('text', ''))
                response = NLPAnalyzeResponse(
                    normalized_text=result['normalized_text'],
                    intent=result['intent'],
                    risk_level=result['risk_level'],
                    risk_score=result['risk_score'],
                    entities=result['entities'],
                    retrieved_context=result['retrieved_context'],
                    decision=result['decision'],
                    model_versions=result.get('model_versions'),
                )
                responses[job.id] = response

                self._persist_analysis(
                    db=db,
                    job_id=job.id,
                    user_id=job.user_id,
                    raw_text=text,
                    response=response,
                    embedding=result.get('embedding'),
                )
                cache_key = self._cache_key(user_id=job.user_id, text=text, top_k=top_k)
                cache_service.set_json(cache_key, jsonable_encoder(response))
                self._log_audit_event(job_id=job.id, user_id=job.user_id, response=response)

        return responses

    def analyze_for_job(self, db: Session, job: AnalysisJob) -> NLPAnalyzeResponse:
        return self.analyze_many_for_jobs(db=db, jobs=[job])[job.id]

    @staticmethod
    def _log_audit_event(job_id: int, user_id: int, response: NLPAnalyzeResponse) -> None:
        logger.info(
            'risk_decision_audit',
            extra={
                'event_type': 'risk_decision',
                'job_id': job_id,
                'user_id': user_id,
                'risk_level': response.risk_level,
                'risk_score': response.risk_score,
                'triage_level': response.decision.triage_level,
                'escalation_required': response.decision.escalation_required,
                'policy_version': response.decision.policy_version,
                'model_versions': response.model_versions,
            },
        )

    @staticmethod
    def _cache_key(user_id: int, text: str, top_k: int) -> str:
        payload = f'{user_id}:{top_k}:{text}'.encode('utf-8')
        digest = hashlib.sha256(payload).hexdigest()
        return f'nlp:analysis:{digest}'

    @staticmethod
    def _persist_analysis(
        db: Session,
        job_id: int,
        user_id: int,
        raw_text: str,
        response: NLPAnalyzeResponse,
        embedding: list[float] | None,
    ) -> None:
        record = SymptomRecord(
            analysis_job_id=job_id,
            user_id=user_id,
            raw_text=raw_text,
            normalized_text=response.normalized_text,
            intent=response.intent,
            risk_level=response.risk_level,
            risk_score=response.risk_score,
            entities=[entity.dict() for entity in response.entities],
            decision=response.decision.dict(),
            embedding=embedding,
        )
        db.add(record)
        db.commit()


nlp_service = NLPService()
