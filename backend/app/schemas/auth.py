from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
        validation_alias=AliasChoices('confirm_password', 'confirmPassword'),
    )
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator('name')
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError('name must be at least 2 characters long')
        return cleaned

    @field_validator('username')
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower()
        if not cleaned:
            return None
        if not all(ch.isalnum() or ch == '_' for ch in cleaned):
            raise ValueError('username can only contain letters, numbers, and underscores')
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr | None = None
    identifier: str | None = Field(default=None, min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @model_validator(mode='after')
    def ensure_identifier(self) -> 'LoginRequest':
        if self.email is None and not self.identifier:
            raise ValueError('email or identifier is required')
        return self

    @field_validator('identifier')
    @classmethod
    def normalize_identifier(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        return cleaned

    @property
    def resolved_identifier(self) -> str:
        if self.email:
            return self.email.strip().lower()
        return (self.identifier or '').strip().lower()


class GoogleLoginRequest(BaseModel):
    token: str = Field(min_length=10)

    @field_validator('token')
    @classmethod
    def normalize_token(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('token is required')
        return cleaned


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    username: str | None = None
    is_google_user: bool
    role: str
    is_active: bool
    created_at: datetime


class RegisterResponse(BaseModel):
    success: bool = True
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_in: int
    user: UserResponse
