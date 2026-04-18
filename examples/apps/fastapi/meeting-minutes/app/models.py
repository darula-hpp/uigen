"""SQLAlchemy database models."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Template(Base):
    """Template model for storing Word document templates with Jinja2 variables."""
    
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    population_type = Column(String(20), nullable=False)
    jinja_shape = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint(
            "population_type IN ('ai', 'manual')",
            name="check_population_type"
        ),
    )
    
    # Relationships
    associations = relationship(
        "MeetingTemplateAssociation",
        back_populates="template",
        cascade="all, delete-orphan"
    )


class Meeting(Base):
    """Meeting model for storing meeting metadata and recordings."""
    
    __tablename__ = "meetings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    datetime = Column(DateTime(timezone=True), nullable=False)
    recording_path = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    associations = relationship(
        "MeetingTemplateAssociation",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )
    documents = relationship(
        "GeneratedDocument",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )


class MeetingTemplateAssociation(Base):
    """Association table linking meetings with templates and storing filled data."""
    
    __tablename__ = "meeting_template_associations"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    template_id = Column(
        Integer,
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    order_index = Column(Integer, nullable=False)
    filled_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint("meeting_id", "template_id", name="uq_meeting_template"),
        UniqueConstraint("meeting_id", "order_index", name="uq_meeting_order"),
    )
    
    # Relationships
    meeting = relationship("Meeting", back_populates="associations")
    template = relationship("Template", back_populates="associations")


class GeneratedDocument(Base):
    """Generated document model for storing rendered documents and PDFs."""
    
    __tablename__ = "generated_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    template_id = Column(
        Integer,
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False
    )
    docx_path = Column(String(512), nullable=False)
    pdf_path = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint("meeting_id", "template_id", name="uq_meeting_template_doc"),
    )
    
    # Relationships
    meeting = relationship("Meeting", back_populates="documents")


class User(Base):
    """User model for authentication and account management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    reset_token_hash = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )
