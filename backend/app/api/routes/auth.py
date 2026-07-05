from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    LogoutResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserProfileResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenRefreshRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    SetPasswordRequest,
    ChangePasswordRequest,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix='/auth', tags=['Auth'])


@router.post('/register', response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    return auth_service.register_user(db, payload)


@router.post('/login', response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.login_user(db, payload)


@router.post('/token', response_model=TokenResponse)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    payload = LoginRequest(identifier=form_data.username, password=form_data.password)
    return auth_service.login_user(db, payload)


@router.post('/google', response_model=TokenResponse)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.google_login(db, payload)


@router.get('/me', response_model=UserProfileResponse)
def get_authenticated_user(current_user: User = Depends(get_current_user)) -> UserProfileResponse:
    return UserProfileResponse(data=auth_service.to_user_response(current_user))


@router.post('/logout', response_model=LogoutResponse)
def logout_user(_: User = Depends(get_current_user)) -> LogoutResponse:
    return LogoutResponse()


@router.post('/forgot-password')
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.forgot_password(db, payload.email)


@router.post('/reset-password')
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.reset_password(db, payload.token, payload.password)


@router.post('/refresh', response_model=TokenResponse)
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.refresh_access_token(db, payload.refresh_token)


@router.post('/verify-email')
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    return auth_service.verify_email(db, payload.token)


@router.post('/resend-verification')
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    return auth_service.resend_verification(db, payload.email)


@router.post('/set-password')
def set_password(
    payload: SetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.set_password(db, current_user, payload.password)


@router.post('/change-password')
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.change_password(db, current_user, payload.current_password, payload.new_password)
