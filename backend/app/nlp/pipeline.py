from typing import Any

from sqlalchemy.orm import Session

from app.core.observability import observe_stage, traced_span
from app.nlp.model_manager import model_manager
from app.nlp.preprocessing.text_cleaner import TextPreprocessor
from app.nlp.retrieval.vector_retriever import VectorRetriever
from app.services.decision_service import decision_service


class NLPPipeline:
    def __init__(self) -> None:
        self.preprocessor = TextPreprocessor()
        self.model_manager = model_manager
        self.retriever = VectorRetriever()

    def warmup(self) -> None:
        self.model_manager.warmup()

    def analyze(self, db: Session, raw_text: str, top_k: int) -> dict[str, Any]:
        batch_result = self.analyze_batch(db=db, raw_texts=[raw_text], top_k=top_k)
        return batch_result[0]

    def analyze_batch(self, db: Session, raw_texts: list[str], top_k: int) -> list[dict[str, Any]]:
        if not raw_texts:
            return []

        with traced_span('nlp.pipeline.batch', {'batch_size': len(raw_texts), 'top_k': top_k}):
            with observe_stage('preprocess'):
                normalized_texts = [self.preprocessor.normalize(text) for text in raw_texts]

            with observe_stage('ner'):
                entity_batches = self.model_manager.extract_entities_batch(normalized_texts)

            with observe_stage('classification'):
                classifications = self.model_manager.classify_risk_batch(normalized_texts, entity_batches)

            with observe_stage('embeddings'):
                embeddings = self.model_manager.generate_embeddings_batch(normalized_texts)

            results: list[dict[str, Any]] = []
            with observe_stage('retrieval_and_decision'):
                for normalized_text, entities, classification, embedding in zip(
                    normalized_texts,
                    entity_batches,
                    classifications,
                    embeddings,
                ):
                    retrieved = self.retriever.retrieve(
                        db=db,
                        query_text=normalized_text,
                        embedding=embedding,
                        limit=top_k,
                    )

                    decision = decision_service.decide(
                        normalized_text=normalized_text,
                        risk_score=classification['risk_score'],
                        risk_level=classification['risk_level'],
                        entities=entities,
                    )

                    results.append(
                        {
                            'normalized_text': normalized_text,
                            'intent': classification['intent'],
                            'risk_level': classification['risk_level'],
                            'risk_score': classification['risk_score'],
                            'entities': entities,
                            'retrieved_context': retrieved,
                            'decision': decision,
                            'embedding': embedding,
                            'model_versions': self.model_manager.model_versions(),
                        }
                    )

            return results


nlp_pipeline = NLPPipeline()
