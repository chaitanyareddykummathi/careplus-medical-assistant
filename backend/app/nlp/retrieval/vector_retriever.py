from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.prediction import KnowledgeChunk

settings = get_settings()


class VectorRetriever:
    def retrieve(
        self,
        db: Session,
        query_text: str,
        embedding: list[float],
        limit: int,
    ) -> list[dict]:
        try:
            if db.bind and db.bind.dialect.name == 'postgresql':
                db.execute(text(f'SET LOCAL ivfflat.probes = {settings.vector_ivfflat_probes}'))

            distance = KnowledgeChunk.embedding.cosine_distance(embedding).label('distance')
            query = db.query(
                KnowledgeChunk,
                distance,
            ).order_by(distance)

            rows = query.limit(limit).all()
            if rows:
                return [
                    {
                        'chunk_id': chunk.id,
                        'title': chunk.title,
                        'source': chunk.source,
                        'score': float(1.0 - min(distance, 1.0)),
                    }
                    for chunk, distance in rows
                ]
        except Exception:
            db.rollback()

        keywords = [token for token in query_text.split() if len(token) > 4][:5]
        fallback_query = db.query(KnowledgeChunk)
        if keywords:
            clauses = [KnowledgeChunk.content.ilike(f'%{token}%') for token in keywords]
            fallback_query = fallback_query.filter(or_(*clauses))

        chunks = fallback_query.order_by(KnowledgeChunk.created_at.desc()).limit(limit).all()
        return [
            {
                'chunk_id': chunk.id,
                'title': chunk.title,
                'source': chunk.source,
                'score': 0.30,
            }
            for chunk in chunks
        ]
