from sqlalchemy import JSON, Column, Integer, String, Text

from app.db.base import Base
from app.models.base import TimestampMixin

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover
    Vector = None


class KnowledgeChunk(TimestampMixin, Base):
    __tablename__ = 'knowledge_chunks'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    source = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(JSON, nullable=False, default=dict)

    if Vector is not None:
        embedding = Column(Vector(384), nullable=True)
    else:
        embedding = Column(JSON, nullable=True)
