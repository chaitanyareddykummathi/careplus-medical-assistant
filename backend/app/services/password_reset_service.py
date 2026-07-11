import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.errors import AppException
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User


class PasswordResetService:
    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def generate_token(self, db: Session, user_id: int) -> str:
        """
        Generates a secure random URL-safe token, hashes it,
        saves the hash with 15-minute expiry in DB, and returns the raw token.
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        # Deactivate any previous unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        db_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )
        db.add(db_token)
        db.commit()

        return raw_token

    def validate_and_use_token(self, db: Session, token: str) -> User:
        """
        Validates token hash, checks expiry, invalidates it, and returns the owner user.
        Raises AppException if invalid/expired.
        """
        token_hash = self._hash_token(token)
        db_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used == False
        ).first()

        if not db_token:
            raise AppException(400, "INVALID_RESET_TOKEN", "Invalid or expired reset token.")

        # Handle timezones safely
        expires_at = db_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            db_token.is_used = True
            db.commit()
            raise AppException(400, "EXPIRED_RESET_TOKEN", "Reset token has expired. Please request another link.")

        # Mark as used
        db_token.is_used = True
        db.commit()

        user = db.query(User).filter(User.id == db_token.user_id).first()
        if not user or not user.is_active:
            raise AppException(400, "INACTIVE_USER", "The user account is currently disabled.")

        return user


password_reset_service = PasswordResetService()
