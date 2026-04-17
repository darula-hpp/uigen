"""Property-based tests for repository layer."""
import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime

from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize, invariant

from app.repositories.template_repository import TemplateRepository
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas import PopulationType, MeetingCreate


# Property 3: File Storage Persistence
# For any uploaded file, storing the file to the filesystem SHALL make it retrievable at the stored path.

@pytest.mark.asyncio
@given(
    file_content=st.binary(min_size=1, max_size=1024),
    filename=st.text(
        alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), min_codepoint=65, max_codepoint=122),
        min_size=1,
        max_size=50
    ).filter(lambda x: x and not x.startswith('.'))
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_file_storage_persistence_template(
    file_content: bytes,
    filename: str,
    db_session
):
    """
    Property 3: File Storage Persistence (Templates)
    
    For any template file, storing it to the filesystem SHALL make it retrievable at the stored path.
    
    Validates: Requirements 3.3, 7.3
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a template record first to get an ID
        template = await repo.create(
            name=f"Test Template {filename}",
            population_type=PopulationType.MANUAL,
            file_path="placeholder",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Get the storage path for this template
        storage_path = repo.get_template_file_path(template.id)
        
        # Store the file
        storage_path.write_bytes(file_content)
        
        # Verify the file is retrievable
        assert storage_path.exists(), "File should exist at stored path"
        retrieved_content = storage_path.read_bytes()
        assert retrieved_content == file_content, "Retrieved content should match original"


@pytest.mark.asyncio
@given(
    file_content=st.binary(min_size=1, max_size=1024),
    filename=st.text(
        alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), min_codepoint=65, max_codepoint=122),
        min_size=1,
        max_size=50
    ).filter(lambda x: x and not x.startswith('.'))
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_file_storage_persistence_meeting(
    file_content: bytes,
    filename: str,
    db_session
):
    """
    Property 3: File Storage Persistence (Meetings)
    
    For any meeting recording file, storing it to the filesystem SHALL make it retrievable at the stored path.
    
    Validates: Requirements 3.3, 7.3
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        repo = MeetingRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting record first to get an ID
        meeting_data = MeetingCreate(
            title=f"Test Meeting {filename}",
            datetime=datetime.now()
        )
        meeting = await repo.create(meeting_data, recording_path=None)
        
        # Get the storage path for this meeting
        storage_path = repo.get_storage_path(meeting.id) / f"{meeting.id}_recording.mp3"
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Store the file
        storage_path.write_bytes(file_content)
        
        # Verify the file is retrievable
        assert storage_path.exists(), "File should exist at stored path"
        retrieved_content = storage_path.read_bytes()
        assert retrieved_content == file_content, "Retrieved content should match original"


@pytest.mark.asyncio
@given(
    file_content=st.binary(min_size=1, max_size=1024),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_file_storage_persistence_document(
    file_content: bytes,
    db_session
):
    """
    Property 3: File Storage Persistence (Documents)
    
    For any generated document file, storing it to the filesystem SHALL make it retrievable at the stored path.
    
    Validates: Requirements 3.3, 7.3
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create meeting and template first
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        doc_repo = DocumentRepository(db_session, storage_path=temp_dir)
        
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await meeting_repo.create(meeting_data, recording_path=None)
        
        template = await template_repo.create(
            name="Test Template",
            population_type=PopulationType.MANUAL,
            file_path="placeholder",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Create document record
        doc_storage_path = doc_repo.get_storage_path(meeting.id)
        doc_storage_path.mkdir(parents=True, exist_ok=True)
        docx_path = str(doc_storage_path / f"{meeting.id}_{template.id}.docx")
        document = await doc_repo.create(
            meeting_id=meeting.id,
            template_id=template.id,
            docx_path=docx_path
        )
        
        # Store the file
        Path(docx_path).write_bytes(file_content)
        
        # Verify the file is retrievable
        assert Path(docx_path).exists(), "File should exist at stored path"
        retrieved_content = Path(docx_path).read_bytes()
        assert retrieved_content == file_content, "Retrieved content should match original"


# Property 4: Cleanup Cascade
# For any entity with associated files, deleting the entity SHALL remove all associated files from storage.

@pytest.mark.asyncio
@given(
    file_content=st.binary(min_size=1, max_size=1024),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_cleanup_cascade_template(
    file_content: bytes,
    db_session
):
    """
    Property 4: Cleanup Cascade (Templates)
    
    For any template with associated files, deleting the template SHALL remove all associated files from storage.
    
    Validates: Requirements 2.4, 2.5, 3.8
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a template
        template = await repo.create(
            name="Test Template",
            population_type=PopulationType.MANUAL,
            file_path="placeholder",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Store a file for this template
        storage_path = repo.get_template_file_path(template.id)
        storage_path.write_bytes(file_content)
        
        # Verify file exists
        assert storage_path.exists(), "File should exist before deletion"
        
        # Delete the template
        deleted = await repo.delete(template.id)
        await db_session.commit()
        assert deleted, "Template should be deleted"
        
        # Verify file is removed
        assert not storage_path.exists(), "File should be removed after template deletion"
        assert not storage_path.parent.exists(), "Template directory should be removed"


@pytest.mark.asyncio
@given(
    file_content=st.binary(min_size=1, max_size=1024),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_cleanup_cascade_meeting(
    file_content: bytes,
    db_session
):
    """
    Property 4: Cleanup Cascade (Meetings)
    
    For any meeting with associated files, deleting the meeting SHALL remove all associated files from storage.
    
    Validates: Requirements 2.4, 2.5, 3.8
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        repo = MeetingRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await repo.create(meeting_data, recording_path=None)
        
        # Store a recording file for this meeting
        storage_path = repo.get_storage_path(meeting.id) / f"{meeting.id}_recording.mp3"
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        storage_path.write_bytes(file_content)
        
        # Verify file exists
        assert storage_path.exists(), "File should exist before deletion"
        
        # Delete the meeting
        deleted = await repo.delete(meeting.id)
        assert deleted, "Meeting should be deleted"
        
        # Verify file is removed
        assert not storage_path.exists(), "File should be removed after meeting deletion"
        # Note: Meeting repository may not remove the directory if it's not empty


# Property 13: Foreign Key Cascade
# For any parent entity, deleting the parent SHALL cascade to delete all child entities.

@pytest.mark.asyncio
@given(
    num_associations=st.integers(min_value=1, max_value=5),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_foreign_key_cascade_meeting_associations(
    num_associations: int,
    db_session
):
    """
    Property 13: Foreign Key Cascade (Meeting -> Associations)
    
    For any meeting with template associations, deleting the meeting SHALL cascade to delete all associations.
    
    Validates: Requirements 11.7
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await meeting_repo.create(meeting_data, recording_path=None)
        
        # Create templates and associations
        association_ids = []
        for i in range(num_associations):
            template = await template_repo.create(
                name=f"Test Template {i}",
                population_type=PopulationType.MANUAL,
                file_path=f"placeholder_{i}",
                jinja_shape={"type": "object", "properties": {}}
            )
            await db_session.commit()
            
            association = await meeting_repo.add_template_association(
                meeting_id=meeting.id,
                template_id=template.id,
                order_index=i
            )
            association_ids.append(association.id)
        
        # Verify associations exist
        associations_before = await meeting_repo.get_associations(meeting.id)
        assert len(associations_before) == num_associations, "All associations should exist before deletion"
        
        # Delete the meeting
        deleted = await meeting_repo.delete(meeting.id)
        assert deleted, "Meeting should be deleted"
        
        # Verify associations are cascaded (deleted)
        # Try to get associations - should return empty list since meeting is gone
        from sqlalchemy import select
        from app.models import MeetingTemplateAssociation
        
        result = await db_session.execute(
            select(MeetingTemplateAssociation).where(
                MeetingTemplateAssociation.meeting_id == meeting.id
            )
        )
        associations_after = list(result.scalars().all())
        assert len(associations_after) == 0, "All associations should be deleted after meeting deletion"


@pytest.mark.asyncio
@given(
    num_documents=st.integers(min_value=1, max_value=5),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_foreign_key_cascade_meeting_documents(
    num_documents: int,
    db_session
):
    """
    Property 13: Foreign Key Cascade (Meeting -> Documents)
    
    For any meeting with generated documents, deleting the meeting SHALL cascade to delete all documents.
    
    Validates: Requirements 11.7
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        doc_repo = DocumentRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await meeting_repo.create(meeting_data, recording_path=None)
        
        # Create templates and documents
        for i in range(num_documents):
            template = await template_repo.create(
                name=f"Test Template {i}",
                population_type=PopulationType.MANUAL,
                file_path=f"placeholder_{i}",
                jinja_shape={"type": "object", "properties": {}}
            )
            await db_session.commit()
            
            doc_storage_path = doc_repo.get_storage_path(meeting.id)
            doc_storage_path.mkdir(parents=True, exist_ok=True)
            docx_path = str(doc_storage_path / f"{meeting.id}_{template.id}.docx")
            await doc_repo.create(
                meeting_id=meeting.id,
                template_id=template.id,
                docx_path=docx_path
            )
        
        # Verify documents exist
        documents_before = await doc_repo.get_by_meeting_id(meeting.id)
        assert len(documents_before) == num_documents, "All documents should exist before deletion"
        
        # Delete the meeting
        deleted = await meeting_repo.delete(meeting.id)
        assert deleted, "Meeting should be deleted"
        
        # Verify documents are cascaded (deleted)
        from sqlalchemy import select
        from app.models import GeneratedDocument
        
        result = await db_session.execute(
            select(GeneratedDocument).where(
                GeneratedDocument.meeting_id == meeting.id
            )
        )
        documents_after = list(result.scalars().all())
        assert len(documents_after) == 0, "All documents should be deleted after meeting deletion"


@pytest.mark.asyncio
async def test_property_foreign_key_cascade_template_associations(
    db_session
):
    """
    Property 13: Foreign Key Cascade (Template -> Associations)
    
    For any template with meeting associations, deleting the template SHALL cascade to delete all associations.
    
    Validates: Requirements 11.7
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a template
        template = await template_repo.create(
            name="Test Template",
            population_type=PopulationType.MANUAL,
            file_path="placeholder",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Create meetings and associate with template
        num_meetings = 3
        for i in range(num_meetings):
            meeting_data = MeetingCreate(
                title=f"Test Meeting {i}",
                datetime=datetime.now()
            )
            meeting = await meeting_repo.create(meeting_data, recording_path=None)
            
            await meeting_repo.add_template_association(
                meeting_id=meeting.id,
                template_id=template.id,
                order_index=0
            )
        
        # Verify associations exist
        from sqlalchemy import select
        from app.models import MeetingTemplateAssociation
        
        result = await db_session.execute(
            select(MeetingTemplateAssociation).where(
                MeetingTemplateAssociation.template_id == template.id
            )
        )
        associations_before = list(result.scalars().all())
        assert len(associations_before) == num_meetings, "All associations should exist before deletion"
        
        # Delete the template
        deleted = await template_repo.delete(template.id)
        await db_session.commit()
        assert deleted, "Template should be deleted"
        
        # Verify associations are cascaded (deleted)
        result = await db_session.execute(
            select(MeetingTemplateAssociation).where(
                MeetingTemplateAssociation.template_id == template.id
            )
        )
        associations_after = list(result.scalars().all())
        assert len(associations_after) == 0, "All associations should be deleted after template deletion"


# Property 14: Unique Constraint Enforcement
# For any meeting-template combination, duplicate associations SHALL be rejected.

@pytest.mark.asyncio
async def test_property_unique_constraint_meeting_template(
    db_session
):
    """
    Property 14: Unique Constraint Enforcement (Meeting-Template)
    
    For any meeting-template combination, attempting to create duplicate associations SHALL be rejected.
    
    Validates: Requirements 11.8
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting and template
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await meeting_repo.create(meeting_data, recording_path=None)
        
        template = await template_repo.create(
            name="Test Template",
            population_type=PopulationType.MANUAL,
            file_path="placeholder",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Create first association
        association1 = await meeting_repo.add_template_association(
            meeting_id=meeting.id,
            template_id=template.id,
            order_index=0
        )
        assert association1 is not None, "First association should be created"
        
        # Attempt to create duplicate association (same meeting-template)
        from sqlalchemy.exc import IntegrityError
        
        with pytest.raises(IntegrityError) as exc_info:
            await meeting_repo.add_template_association(
                meeting_id=meeting.id,
                template_id=template.id,
                order_index=1  # Different order index, but same meeting-template
            )
        
        # Verify the error is due to unique constraint
        assert "uq_meeting_template" in str(exc_info.value).lower() or "unique" in str(exc_info.value).lower(), \
            "Error should be due to unique constraint violation"


@pytest.mark.asyncio
async def test_property_unique_constraint_meeting_order(
    db_session
):
    """
    Property 14: Unique Constraint Enforcement (Meeting-Order)
    
    For any meeting, attempting to create associations with duplicate order indices SHALL be rejected.
    
    Validates: Requirements 11.8
    """
    # Create temporary storage directory
    with tempfile.TemporaryDirectory() as temp_dir:
        meeting_repo = MeetingRepository(db_session, storage_path=temp_dir)
        template_repo = TemplateRepository(db_session, storage_path=temp_dir)
        
        # Create a meeting and two templates
        meeting_data = MeetingCreate(
            title="Test Meeting",
            datetime=datetime.now()
        )
        meeting = await meeting_repo.create(meeting_data, recording_path=None)
        
        template1 = await template_repo.create(
            name="Test Template 1",
            population_type=PopulationType.MANUAL,
            file_path="placeholder1",
            jinja_shape={"type": "object", "properties": {}}
        )
        
        template2 = await template_repo.create(
            name="Test Template 2",
            population_type=PopulationType.MANUAL,
            file_path="placeholder2",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        # Create first association with order_index=0
        association1 = await meeting_repo.add_template_association(
            meeting_id=meeting.id,
            template_id=template1.id,
            order_index=0
        )
        assert association1 is not None, "First association should be created"
        
        # Attempt to create second association with same order_index
        from sqlalchemy.exc import IntegrityError
        
        with pytest.raises(IntegrityError) as exc_info:
            await meeting_repo.add_template_association(
                meeting_id=meeting.id,
                template_id=template2.id,
                order_index=0  # Same order index for same meeting
            )
        
        # Verify the error is due to unique constraint
        assert "uq_meeting_order" in str(exc_info.value).lower() or "unique" in str(exc_info.value).lower(), \
            "Error should be due to unique constraint violation"
