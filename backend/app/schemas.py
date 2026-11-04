"""Request bodies. Responses are plain dicts built by small serializer functions in each router."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


def _check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes.")
    return value


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str | None = Field(default=None, max_length=40)

    _pw = field_validator("password")(_check_password)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        value = (value or "").strip()
        return value or None


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str

    _pw = field_validator("password")(_check_password)


class ShareIn(BaseModel):
    is_public: bool


class RenameIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)

    @field_validator("title")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title can't be empty.")
        return value


class StickerVisibilityIn(BaseModel):
    is_public: bool
