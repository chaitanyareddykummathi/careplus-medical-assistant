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
