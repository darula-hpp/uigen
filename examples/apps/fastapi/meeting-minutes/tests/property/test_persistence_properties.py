"""Property-based tests for data persistence round-trip.

Feature: meeting-minutes-backend
Property 2: Data Persistence Round-Trip

**Validates: Requirements 1.4, 3.2, 4.2, 7.4**

For any valid entity (template, meeting, association, document), storing the entity 
in the database then retrieving it SHALL produce data equivalent to the original input.

This test suite includes 5 property tests covering all entities:
1. Template persistence round-trip
2. Meeting persistence round-trip (without recording)
3. Meeting persistence round-trip (with recording)
4. Association persistence round-trip
5. Generated document persistence round-trip

Each test uses Hypothesis to generate 100 random examples and verifies that:
- Data stored in the database can be retrieved
- Retrieved data is equivalent to the original input
- All fields are preserved correctly
"""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timezone
from pathlib import Path
from app.models import Template, Meeting, MeetingTemplateAssociation, GeneratedDocument
from app.repositories.template_repository import TemplateRepository
from app.repositories.meeting_repository import MeetingRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas import TemplateCreate, MeetingCreate, PopulationType


# Hypothesis strategies for generating test data

@st.composite
def template_data_strategy(draw):
    """Generate random template data."""
    name = draw(st.text(min_size=1, max_size=255, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
        blacklist_characters='\x00'
    )))
    population_type = draw(st.sampled_from([PopulationType.AI, PopulationType.MANUAL]))
    
    # Generate a simple jinja_shape
    jinja_shape = {
        "type": "object",
        "properties": {
            draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll'),
                blacklist_characters='\x00'
            ))): {"type": draw(st.sampled_from(["string", "number", "boolean"]))}
        }
    }
    
    return TemplateCreate(name=name, population_type=population_type), jinja_shape


@st.composite
def meeting_data_strategy(draw):
    """Generate random meeting data."""
    title = draw(st.text(min_size=1, max_size=255, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
        blacklist_characters='\x00'
    )))
    
    # Generate a datetime in the past year
    timestamp = draw(st.integers(
        min_value=int(datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp()),
        max_value=int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())
    ))
    meeting_datetime = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    
    return MeetingCreate(title=title, datetime=meeting_datetime)


@st.composite
def association_data_strategy(draw):
    """Generate random association data."""
    order_index = draw(st.integers(min_value=0, max_value=100))
    filled_data = draw(st.one_of(
        st.none(),
        st.dictionaries(
            keys=st.text(min_size=1, max_size=50, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll'),
                blacklist_characters='\x00'
            )),
            values=st.one_of(
                st.text(max_size=100),
                st.integers(),
                st.booleans()
            ),
            min_size=0,
            max_size=5
        )
    ))
    
    return order_index, filled_data


@st.composite
def document_data_strategy(draw):
    """Generate random document data."""
    docx_filename = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'),
        blacklist_characters='\x00'
    ))) + ".docx"
    
    pdf_filename = draw(st.one_of(
        st.none(),
        st.text(min_size=1, max_size=100, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            blacklist_characters='\x00'
        )).map(lambda x: x + ".pdf")
    ))
    
    return docx_filename, pdf_filename


# Property Tests

@pytest.mark.asyncio
@given(template_data=template_data_strategy())
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_template_persistence_round_trip(db_session, temp_storage, template_data):
    """
    Property: Template persistence round-trip.
    
    For any valid template data, storing it in the database then retrieving it
    SHALL produce data equivalent to the original input.
    """
    template_create, jinja_shape = template_data
    
    # Create repository
    repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a dummy file path
    template_dir = temp_storage / "templates" / "test"
    template_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(template_dir / "template.docx")
    Path(file_path).touch()
    
    # Store template
    stored_template = await repo.create(
        template_data=template_create,
        file_path=file_path,
        jinja_shape=jinja_shape
    )
    
    # Retrieve template
    retrieved_template = await repo.get_by_id(stored_template.id)
    
    # Verify equivalence
    assert retrieved_template is not None
    assert retrieved_template.name == template_create.name
    assert retrieved_template.population_type == template_create.population_type.value
    assert retrieved_template.file_path == file_path
    assert retrieved_template.jinja_shape == jinja_shape
    assert retrieved_template.id == stored_template.id
    assert retrieved_template.created_at is not None


@pytest.mark.asyncio
@given(meeting_data=meeting_data_strategy())
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_meeting_persistence_round_trip(db_session, temp_storage, meeting_data):
    """
    Property: Meeting persistence round-trip.
    
    For any valid meeting data, storing it in the database then retrieving it
    SHALL produce data equivalent to the original input.
    """
    # Create repository
    repo = MeetingRepository(db_session, str(temp_storage))
    
    # Store meeting without recording
    stored_meeting = await repo.create(meeting_data=meeting_data)
    
    # Retrieve meeting
    retrieved_meeting = await repo.get_by_id(stored_meeting.id)
    
    # Verify equivalence
    assert retrieved_meeting is not None
    assert retrieved_meeting.title == meeting_data.title
    # Compare datetimes - SQLite doesn't preserve timezone, so compare as naive
    expected_dt = meeting_data.datetime.replace(tzinfo=None) if meeting_data.datetime.tzinfo else meeting_data.datetime
    retrieved_dt = retrieved_meeting.datetime.replace(tzinfo=None) if retrieved_meeting.datetime.tzinfo else retrieved_meeting.datetime
    assert abs((retrieved_dt - expected_dt).total_seconds()) < 1
    assert retrieved_meeting.recording_path is None
    assert retrieved_meeting.id == stored_meeting.id
    assert retrieved_meeting.created_at is not None


@pytest.mark.asyncio
@given(
    meeting_data=meeting_data_strategy(),
    recording_filename=st.text(min_size=1, max_size=100, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'),
        blacklist_characters='\x00'
    ))
)
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_meeting_with_recording_persistence_round_trip(
    db_session, temp_storage, meeting_data, recording_filename
):
    """
    Property: Meeting with recording persistence round-trip.
    
    For any valid meeting data with recording, storing it in the database then 
    retrieving it SHALL produce data equivalent to the original input.
    """
    # Create repository
    repo = MeetingRepository(db_session, str(temp_storage))
    
    # Create a dummy recording file
    meeting_dir = temp_storage / "meetings" / "test"
    meeting_dir.mkdir(parents=True, exist_ok=True)
    recording_path = str(meeting_dir / f"{recording_filename}.mp3")
    Path(recording_path).touch()
    
    # Store meeting with recording
    stored_meeting = await repo.create(
        meeting_data=meeting_data,
        recording_path=recording_path
    )
    
    # Retrieve meeting
    retrieved_meeting = await repo.get_by_id(stored_meeting.id)
    
    # Verify equivalence
    assert retrieved_meeting is not None
    assert retrieved_meeting.title == meeting_data.title
    # Compare datetimes - SQLite doesn't preserve timezone, so compare as naive
    expected_dt = meeting_data.datetime.replace(tzinfo=None) if meeting_data.datetime.tzinfo else meeting_data.datetime
    retrieved_dt = retrieved_meeting.datetime.replace(tzinfo=None) if retrieved_meeting.datetime.tzinfo else retrieved_meeting.datetime
    assert abs((retrieved_dt - expected_dt).total_seconds()) < 1
    assert retrieved_meeting.recording_path == recording_path
    assert retrieved_meeting.id == stored_meeting.id


@pytest.mark.asyncio
@given(
    template_data=template_data_strategy(),
    meeting_data=meeting_data_strategy(),
    association_data=association_data_strategy()
)
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_association_persistence_round_trip(
    db_session, temp_storage, template_data, meeting_data, association_data
):
    """
    Property: Association persistence round-trip.
    
    For any valid association data, storing it in the database then retrieving it
    SHALL produce data equivalent to the original input.
    """
    template_create, jinja_shape = template_data
    order_index, filled_data = association_data
    
    # Create repositories
    template_repo = TemplateRepository(db_session, str(temp_storage))
    meeting_repo = MeetingRepository(db_session, str(temp_storage))
    
    # Create template
    template_dir = temp_storage / "templates" / "test_assoc"
    template_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(template_dir / "template.docx")
    Path(file_path).touch()
    
    template = await template_repo.create(
        template_data=template_create,
        file_path=file_path,
        jinja_shape=jinja_shape
    )
    
    # Create meeting
    meeting = await meeting_repo.create(meeting_data=meeting_data)
    
    # Create association
    association = await meeting_repo.add_template_association(
        meeting_id=meeting.id,
        template_id=template.id,
        order_index=order_index
    )
    
    # Update filled data if provided
    if filled_data is not None:
        association = await meeting_repo.update_filled_data(
            meeting_id=meeting.id,
            template_id=template.id,
            filled_data=filled_data
        )
    
    # Retrieve association
    retrieved_association = await meeting_repo.get_association(
        meeting_id=meeting.id,
        template_id=template.id
    )
    
    # Verify equivalence
    assert retrieved_association is not None
    assert retrieved_association.meeting_id == meeting.id
    assert retrieved_association.template_id == template.id
    assert retrieved_association.order_index == order_index
    assert retrieved_association.filled_data == filled_data
    assert retrieved_association.id == association.id


@pytest.mark.asyncio
@given(
    template_data=template_data_strategy(),
    meeting_data=meeting_data_strategy(),
    document_data=document_data_strategy()
)
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
async def test_document_persistence_round_trip(
    db_session, temp_storage, template_data, meeting_data, document_data
):
    """
    Property: Generated document persistence round-trip.
    
    For any valid document data, storing it in the database then retrieving it
    SHALL produce data equivalent to the original input.
    """
    template_create, jinja_shape = template_data
    docx_filename, pdf_filename = document_data
    
    # Create repositories
    template_repo = TemplateRepository(db_session, str(temp_storage))
    meeting_repo = MeetingRepository(db_session, str(temp_storage))
    document_repo = DocumentRepository(db_session, str(temp_storage))
    
    # Create template
    template_dir = temp_storage / "templates" / "test_doc"
    template_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(template_dir / "template.docx")
    Path(file_path).touch()
    
    template = await template_repo.create(
        template_data=template_create,
        file_path=file_path,
        jinja_shape=jinja_shape
    )
    
    # Create meeting
    meeting = await meeting_repo.create(meeting_data=meeting_data)
    
    # Create document paths
    doc_dir = temp_storage / "documents" / str(meeting.id)
    doc_dir.mkdir(parents=True, exist_ok=True)
    docx_path = str(doc_dir / docx_filename)
    Path(docx_path).touch()
    
    pdf_path = None
    if pdf_filename:
        pdf_path = str(doc_dir / pdf_filename)
        Path(pdf_path).touch()
    
    # Create document record
    document = await document_repo.create(
        meeting_id=meeting.id,
        template_id=template.id,
        docx_path=docx_path
    )
    
    # Update PDF path if provided
    if pdf_path:
        document = await document_repo.update_pdf_path(
            meeting_id=meeting.id,
            template_id=template.id,
            pdf_path=pdf_path
        )
    
    # Retrieve document
    retrieved_documents = await document_repo.get_by_meeting_id(meeting.id)
    
    # Verify equivalence
    assert len(retrieved_documents) == 1
    retrieved_document = retrieved_documents[0]
    assert retrieved_document.meeting_id == meeting.id
    assert retrieved_document.template_id == template.id
    assert retrieved_document.docx_path == docx_path
    assert retrieved_document.pdf_path == pdf_path
    assert retrieved_document.id == document.id
    assert retrieved_document.created_at is not None
