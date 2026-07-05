from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class ChatMessage(TimestampMixin, Base):
    __tablename__ = 'chat_messages'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # "user" or "model"
    content = Column(Text, nullable=False)

    user = relationship('User', back_populates='chat_messages')
