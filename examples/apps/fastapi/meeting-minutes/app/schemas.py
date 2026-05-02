"""Pydantic schemas for request/response models."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import re


class PopulationType(str, Enum):
    """Enumeration for template population methods."""
    AI = "ai"
    MANUAL = "manual"


# Type aliases for Jinja2 template data structures
JinjaShape = Dict[str, Any]  # JSON Schema describing template variables
FilledData = Dict[str, Any]  # Variable values for template rendering


# Template Schemas
class TemplateBase(BaseModel):
    """Base schema for template data."""
    name: str
    population_type: PopulationType


class TemplateCreate(TemplateBase):
    """Schema for creating a new template."""
    pass


class Template(TemplateBase):
    """Schema for template response."""
    id: int
    file_path: str
    jinja_shape: JinjaShape
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Meeting Schemas
class MeetingBase(BaseModel):
    """Base schema for meeting data."""
    title: str
    datetime: datetime


class MeetingCreate(MeetingBase):
    """Schema for creating a new meeting."""
    pass


class MeetingUpdate(BaseModel):
    """Schema for updating meeting metadata."""
    title: Optional[str] = None
    datetime: Optional[datetime] = None


class Meeting(MeetingBase):
    """Schema for meeting response."""
    id: int
    recording_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Association Schemas
class AssociationCreate(BaseModel):
    """Schema for creating a meeting-template association."""
    template_id: int
    order_index: int


class Association(BaseModel):
    """Schema for meeting-template association response."""
    id: int
    meeting_id: int
    template_id: int
    order_index: int
    filled_data: Optional[FilledData] = None
    template: Template
    
    class Config:
        from_attributes = True


# Data Submission Schema
class DataSubmission(BaseModel):
    """Schema for submitting filled data for a template."""
    filled_data: FilledData


# Document Schemas
class GeneratedDocumentSchema(BaseModel):
    """Schema for generated document response."""
    id: int
    meeting_id: int
    template_id: int
    docx_path: str
    pdf_path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Auth Schemas
from pydantic import EmailStr, ConfigDict


class UserRegister(BaseModel):
    """Schema for user registration request."""
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=72)
    email: Optional[EmailStr] = None


class UserLogin(BaseModel):
    """Schema for user login request."""
    username: str
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile.
    
    Validates:
    - Requirements 2.6: Username pattern (alphanumeric and underscores)
    - Requirements 2.7: Min/max length constraints (username: 3-50 chars, email: max 255 chars)
    """
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = Field(None, max_length=255)
    
    @field_validator('username')
    @classmethod
    def validate_username_pattern(cls, v: Optional[str]) -> Optional[str]:
        """Validate username contains only alphanumeric characters and underscores.
        
        Args:
            v: Username value to validate
            
        Returns:
            Validated username value
            
        Raises:
            ValueError: If username contains invalid characters
        """
        if v is not None:
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError('Username must contain only letters, numbers, and underscores')
        return v


class PasswordResetRequest(BaseModel):
    """Schema for requesting a password reset."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordResetConfirm(BaseModel):
    """Schema for confirming a password reset."""
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    email: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
