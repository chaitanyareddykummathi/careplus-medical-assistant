import hashlib
import logging
import re
import secrets

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserResponse,
)

settings = get_settings()
logger = logging.getLogger(__name__)


class AuthService:
    def register_user(self, db: Session, payload: RegisterRequest) -> RegisterResponse:
        email = str(payload.email).strip().lower()
        logger.info(
            'Register attempt received.',
            extra={'auth_email': email, 'auth_username': payload.username},
        )
        if payload.confirm_password is not None and payload.password != payload.confirm_password:
            logger.warning('Register failed: password mismatch.', extra={'auth_email': email})
            raise AppException(
                status_code=400,
                error_code='PASSWORD_MISMATCH',
                message='Password and confirm password do not match.',
            )

        normalized_email = email
        existing_email = (
            db.query(User)
            .filter(func.lower(User.email) == normalized_email)
            .first()
        )
        if existing_email:
            logger.warning('Register failed: duplicate email.', extra={'auth_email': normalized_email})
            raise AppException(
                status_code=409,
                error_code='EMAIL_ALREADY_EXISTS',
                message='Email is already registered.',
            )

        normalized_username = payload.username.strip().lower() if payload.username else None
        if normalized_username:
            existing_username = (
                db.query(User)
                .filter(func.lower(User.username) == normalized_username)
                .first()
            )
            if existing_username:
                logger.warning(
                    'Register failed: duplicate username.',
                    extra={'auth_username': normalized_username},
                )
                raise AppException(
                    status_code=409,
                    error_code='USERNAME_ALREADY_EXISTS',
                    message='Username is already taken.',
                )

        new_user = User(
            name=payload.name.strip(),
            email=normalized_email,
            username=normalized_username,
            hashed_password=hash_password(payload.password),
            is_google_user=False,
            role='patient',
            is_active=True,
        )
        db.add(new_user)
        try:
            db.commit()
            db.refresh(new_user)
        except IntegrityError as exc:
            db.rollback()
            print("real db error",str(exc))
            logger.warning(
                'Register failed: integrity violation.',
                extra={'auth_email': normalized_email},
            )
            raise AppException(
                status_code=409,
                error_code='ACCOUNT_ALREADY_EXISTS',
                message='Account already exists for this email/username.',
            ) from exc
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception('Register failed: database error.', extra={'auth_email': normalized_email})
            raise AppException(
                status_code=500,
                error_code='DATABASE_ERROR',
                message='Unable to register right now. Please try again shortly.',
            ) from exc

        logger.info('Register successful.', extra={'user_id': new_user.id, 'auth_email': normalized_email})

        return RegisterResponse(success=True, message='User registered')

    def login_user(self, db: Session, payload: LoginRequest) -> TokenResponse:
        identifier = payload.resolved_identifier
        logger.info('Login attempt received.', extra={'auth_identifier': identifier})
        user = self._find_user_by_identifier(db, identifier)
        if not user:
            logger.warning('Login failed: user not found.', extra={'auth_identifier': identifier})
            raise AppException(
                status_code=401,
                error_code='INVALID_CREDENTIALS',
                message='Invalid email/username or password.',
            )

        if user.is_google_user:
            logger.warning('Login blocked: Google-only account.', extra={'user_id': user.id})
            raise AppException(
                status_code=401,
                error_code='GOOGLE_ACCOUNT_ONLY',
                message='This account uses Google sign-in. Continue with Google.',
            )

        if not verify_password(payload.password, user.hashed_password or ''):
            logger.warning('Login failed: bad password.', extra={'user_id': user.id})
            raise AppException(
                status_code=401,
                error_code='INVALID_CREDENTIALS',
                message='Invalid email/username or password.',
            )

        if not user.is_active:
            logger.warning('Login blocked: inactive user.', extra={'user_id': user.id})
            raise AppException(
                status_code=403,
                error_code='USER_DISABLED',
                message='Account is disabled.',
            )

        logger.info('Login successful.', extra={'user_id': user.id})
        return self._build_token_response(user)

    def google_login(self, db: Session, payload: GoogleLoginRequest) -> TokenResponse:
        logger.info('Google login attempt received.')
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token
        except ImportError as exc:
            logger.exception('Google login failed: missing dependencies.')
            raise AppException(
                status_code=500,
                error_code='GOOGLE_AUTH_DEPENDENCY_MISSING',
                message='Google authentication dependencies are not installed.',
            ) from exc

        client_id = settings.google_oauth_client_id
        if not client_id:
            logger.error('Google login failed: client ID missing in configuration.')
            raise AppException(
                status_code=500,
                error_code='GOOGLE_OAUTH_NOT_CONFIGURED',
                message='Google OAuth is not configured on the server.',
            )

        try:
            token_data = id_token.verify_oauth2_token(
                payload.token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            logger.warning('Google login failed: invalid token.')
            raise AppException(
                status_code=401,
                error_code='INVALID_GOOGLE_TOKEN',
                message='Google token is invalid or expired.',
            ) from exc

        email = (token_data.get('email') or '').strip().lower()
        logger.info('Google token verified.', extra={'auth_email': email})
        if not email:
            raise AppException(
                status_code=400,
                error_code='GOOGLE_EMAIL_MISSING',
                message='Google account email is missing.',
            )

        if token_data.get('email_verified') is False:
            raise AppException(
                status_code=400,
                error_code='GOOGLE_EMAIL_NOT_VERIFIED',
                message='Google account email is not verified.',
            )

        user = db.query(User).filter(func.lower(User.email) == email).first()
        if not user:
            display_name = (token_data.get('name') or email.split('@')[0]).strip() or 'CarePlus User'
            preferred_username = token_data.get('given_name') or email.split('@')[0]
            generated_username = self._build_unique_username(db, preferred_username)

            user = User(
                name=display_name,
                email=email,
                username=generated_username,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                is_google_user=True,
                role='patient',
                is_active=True,
            )
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
            except SQLAlchemyError as exc:
                db.rollback()
                logger.exception('Google login failed: database error.', extra={'auth_email': email})
                raise AppException(
                    status_code=500,
                    error_code='DATABASE_ERROR',
                    message='Unable to complete Google sign-in. Please try again.',
                ) from exc
            logger.info('Google login created new user.', extra={'user_id': user.id, 'auth_email': email})
        else:
            logger.info('Google login matched existing user.', extra={'user_id': user.id, 'auth_email': email})

        return self._build_token_response(user)

    def _build_token_response(self, user: User) -> TokenResponse:
        token = create_access_token(
            subject=str(user.id),
            additional_claims={
                'email': user.email,
                'auth_provider': 'google' if user.is_google_user else 'password',
            },
        )
        return TokenResponse(
            access_token=token,
            expires_in=settings.jwt_access_token_exp_minutes * 60,
            user=self.to_user_response(user),
        )

    @staticmethod
    def _find_user_by_identifier(db: Session, identifier: str) -> User | None:
        normalized = identifier.strip().lower()
        return (
            db.query(User)
            .filter(
                or_(
                    func.lower(User.email) == normalized,
                    func.lower(User.username) == normalized,
                )
            )
            .first()
        )

    @staticmethod
    def _build_unique_username(db: Session, source: str) -> str:
        base = re.sub(r'[^a-z0-9_]', '_', source.strip().lower())
        base = re.sub(r'_+', '_', base).strip('_')
        if not base:
            base = 'user'
        base = base[:42]

        candidate = base
        counter = 1
        while (
            db.query(User)
            .filter(func.lower(User.username) == candidate.lower())
            .first()
            is not None
        ):
            counter += 1
            suffix = f'_{counter}'
            candidate = f'{base[: 50 - len(suffix)]}{suffix}'

        return candidate

    @staticmethod
    def to_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            username=user.username,
            is_google_user=user.is_google_user,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    @staticmethod
    def build_payload_hash(text: str, user_id: int) -> str:
        key = f'{user_id}:{text}'.encode('utf-8')
        return hashlib.sha256(key).hexdigest()


auth_service = AuthService()
