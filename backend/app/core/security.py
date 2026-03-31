from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    expires_minutes: int | None = None,
    additional_claims: dict | None = None,
) -> str:
    settings = get_settings()
    expiry_minutes = expires_minutes or settings.jwt_access_token_exp_minutes
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + timedelta(minutes=expiry_minutes)

    payload = {
        'sub': subject,
        'exp': expire,
        'iat': issued_at,
    }
    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError('Invalid or expired access token.') from exc
