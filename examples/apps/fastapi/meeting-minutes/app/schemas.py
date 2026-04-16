"""Pydantic schemas for request/response models."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


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
