"""Property-based tests for service layer business logic."""
import pytest
from datetime import datetime
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi import HTTPException

from app.services.meeting_service import MeetingService
from app.repositories.template_repository import TemplateRepository
from app.schemas import PopulationType, MeetingCreate, AssociationCreate


# Property 5: AI Template Constraint
# For any meeting, associating a template with population_type "ai" SHALL succeed if no AI template 
# is currently associated, and SHALL fail with 400 error if an AI template already exists.

@pytest.mark.asyncio
@given(
    num_manual_templates=st.integers(min_value=0, max_value=3),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_ai_template_constraint_success(
    num_manual_templates: int,
    db_session,
    temp_storage
):
    """
    Property 5: AI Template Constraint (Success Case)
    
    For any meeting with zero or more manual templates, associating an AI template SHALL succeed.
    
    Validates: Requirements 4.3, 4.5
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create and associate manual templates
    for i in range(num_manual_templates):
        template = await template_repo.create(
            name=f"Manual Template {i}",
            population_type=PopulationType.MANUAL,
            file_path=f"placeholder_{i}",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        association_data = AssociationCreate(
            template_id=template.id,
            order_index=i
        )
        await meeting_service.associate_template(meeting.id, association_data)
    
    # Create an AI template
    ai_template = await template_repo.create(
        name="AI Template",
        population_type=PopulationType.AI,
        file_path="ai_placeholder",
        jinja_shape={"type": "object", "properties": {}}
    )
    await db_session.commit()
    
    # Associate AI template - should succeed
    association_data = AssociationCreate(
        template_id=ai_template.id,
        order_index=num_manual_templates
    )
    
    association = await meeting_service.associate_template(meeting.id, association_data)
    
    # Verify association was created
    assert association is not None
    assert association.template_id == ai_template.id
    assert association.meeting_id == meeting.id


@pytest.mark.asyncio
@given(
    num_manual_templates=st.integers(min_value=0, max_value=3),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_ai_template_constraint_failure(
    num_manual_templates: int,
    db_session,
    temp_storage
):
    """
    Property 5: AI Template Constraint (Failure Case)
    
    For any meeting with an AI template already associated, attempting to associate 
    a second AI template SHALL fail with 400 error.
    
    Validates: Requirements 4.3, 4.5
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create and associate manual templates
    for i in range(num_manual_templates):
        template = await template_repo.create(
            name=f"Manual Template {i}",
            population_type=PopulationType.MANUAL,
            file_path=f"placeholder_{i}",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        
        association_data = AssociationCreate(
            template_id=template.id,
            order_index=i
        )
        await meeting_service.associate_template(meeting.id, association_data)
    
    # Create and associate first AI template
    ai_template_1 = await template_repo.create(
        name="AI Template 1",
        population_type=PopulationType.AI,
        file_path="ai_placeholder_1",
        jinja_shape={"type": "object", "properties": {}}
    )
    await db_session.commit()
    
    association_data_1 = AssociationCreate(
        template_id=ai_template_1.id,
        order_index=num_manual_templates
    )
    await meeting_service.associate_template(meeting.id, association_data_1)
    
    # Create second AI template
    ai_template_2 = await template_repo.create(
        name="AI Template 2",
        population_type=PopulationType.AI,
        file_path="ai_placeholder_2",
        jinja_shape={"type": "object", "properties": {}}
    )
    await db_session.commit()
    
    # Attempt to associate second AI template - should fail
    association_data_2 = AssociationCreate(
        template_id=ai_template_2.id,
        order_index=num_manual_templates + 1
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await meeting_service.associate_template(meeting.id, association_data_2)
    
    # Verify error is 400 and mentions AI template constraint
    assert exc_info.value.status_code == 400
    assert "ai template" in exc_info.value.detail.lower()


# Property 6: Manual Template Multiplicity
# For any meeting, associating multiple templates with population_type "manual" SHALL succeed 
# and all associations SHALL be stored with their specified order indices.

@pytest.mark.asyncio
@given(
    num_manual_templates=st.integers(min_value=2, max_value=5),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_manual_template_multiplicity(
    num_manual_templates: int,
    db_session,
    temp_storage
):
    """
    Property 6: Manual Template Multiplicity
    
    For any meeting, associating multiple manual templates SHALL succeed and all 
    associations SHALL be stored with their specified order indices.
    
    Validates: Requirements 4.4
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create and associate multiple manual templates
    template_ids = []
    for i in range(num_manual_templates):
        template = await template_repo.create(
            name=f"Manual Template {i}",
            population_type=PopulationType.MANUAL,
            file_path=f"placeholder_{i}",
            jinja_shape={"type": "object", "properties": {}}
        )
        await db_session.commit()
        template_ids.append(template.id)
        
        association_data = AssociationCreate(
            template_id=template.id,
            order_index=i
        )
        association = await meeting_service.associate_template(meeting.id, association_data)
        
        # Verify each association is created successfully
        assert association is not None
        assert association.template_id == template.id
        assert association.order_index == i
    
    # Retrieve all associations
    associations = await meeting_service.get_associations(meeting.id)
    
    # Verify all associations exist
    assert len(associations) == num_manual_templates
    
    # Verify all are manual templates
    for assoc in associations:
        assert assoc.template.population_type == "manual"
    
    # Verify order indices are correct
    for i, assoc in enumerate(associations):
        assert assoc.order_index == i
        assert assoc.template_id == template_ids[i]


# Property 8: Manual Data Validation
# For any Jinja_Shape schema, data conforming to the schema SHALL be accepted, 
# and non-conforming data SHALL be rejected with 400 error.

@pytest.mark.asyncio
@given(
    valid_string=st.text(min_size=1, max_size=100),
    valid_number=st.integers(min_value=-1000, max_value=1000),
    valid_boolean=st.booleans(),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_manual_data_validation_success(
    valid_string: str,
    valid_number: int,
    valid_boolean: bool,
    db_session,
    temp_storage
):
    """
    Property 8: Manual Data Validation (Success Case)
    
    For any data conforming to Jinja_Shape, submitting the data SHALL succeed.
    
    Validates: Requirements 6.3, 6.5
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create a template with specific Jinja shape
    jinja_shape = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "count": {"type": "integer"},
            "active": {"type": "boolean"}
        },
        "required": ["name", "count", "active"]
    }
    
    template = await template_repo.create(
        name="Manual Template",
        population_type=PopulationType.MANUAL,
        file_path="placeholder",
        jinja_shape=jinja_shape
    )
    await db_session.commit()
    
    # Associate template
    association_data = AssociationCreate(
        template_id=template.id,
        order_index=0
    )
    await meeting_service.associate_template(meeting.id, association_data)
    
    # Submit valid data
    filled_data = {
        "name": valid_string,
        "count": valid_number,
        "active": valid_boolean
    }
    
    # Should succeed without raising exception
    await meeting_service.submit_manual_data(meeting.id, template.id, filled_data)
    
    # Verify data was stored
    retrieved_data = await meeting_service.get_filled_data(meeting.id, template.id)
    assert retrieved_data == filled_data


@pytest.mark.asyncio
async def test_property_manual_data_validation_failure(
    db_session,
    temp_storage
):
    """
    Property 8: Manual Data Validation (Failure Case)
    
    For any data NOT conforming to Jinja_Shape, submitting the data SHALL fail with 400 error.
    
    Validates: Requirements 6.3, 6.5
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create a template with specific Jinja shape
    jinja_shape = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "count": {"type": "integer"},
            "active": {"type": "boolean"}
        },
        "required": ["name", "count", "active"]
    }
    
    template = await template_repo.create(
        name="Manual Template",
        population_type=PopulationType.MANUAL,
        file_path="placeholder",
        jinja_shape=jinja_shape
    )
    await db_session.commit()
    
    # Associate template
    association_data = AssociationCreate(
        template_id=template.id,
        order_index=0
    )
    await meeting_service.associate_template(meeting.id, association_data)
    
    # Test various invalid data scenarios
    invalid_data_cases = [
        # Missing required field
        {"name": "test", "count": 123},
        # Wrong type for count (string instead of integer)
        {"name": "test", "count": "not a number", "active": True},
        # Wrong type for active (string instead of boolean)
        {"name": "test", "count": 123, "active": "yes"},
        # Empty object
        {},
    ]
    
    for invalid_data in invalid_data_cases:
        with pytest.raises(HTTPException) as exc_info:
            await meeting_service.submit_manual_data(meeting.id, template.id, invalid_data)
        
        # Verify error is 400
        assert exc_info.value.status_code == 400
        assert "validation" in exc_info.value.detail.lower()


# Property 9: Data Update Idempotence
# For any template association, submitting new data SHALL replace previous data completely.

@pytest.mark.asyncio
@given(
    data1=st.dictionaries(
        keys=st.sampled_from(["name", "count", "active"]),
        values=st.one_of(st.text(min_size=1, max_size=50), st.integers(), st.booleans()),
        min_size=3,
        max_size=3
    ),
    data2=st.dictionaries(
        keys=st.sampled_from(["name", "count", "active"]),
        values=st.one_of(st.text(min_size=1, max_size=50), st.integers(), st.booleans()),
        min_size=3,
        max_size=3
    ),
)
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
async def test_property_data_update_idempotence(
    data1: dict,
    data2: dict,
    db_session,
    temp_storage
):
    """
    Property 9: Data Update Idempotence
    
    For any template association, submitting new data SHALL replace previous data completely.
    
    Validates: Requirements 6.7
    """
    # Create service and repository
    meeting_service = MeetingService(db_session, str(temp_storage))
    template_repo = TemplateRepository(db_session, str(temp_storage))
    
    # Create a meeting
    meeting = await meeting_service.create_meeting(
        title="Test Meeting",
        meeting_datetime=datetime.now(),
        recording=None
    )
    
    # Create a template with flexible Jinja shape
    jinja_shape = {
        "type": "object",
        "properties": {
            "name": {},  # Accept any type
            "count": {},
            "active": {}
        }
    }
    
    template = await template_repo.create(
        name="Manual Template",
        population_type=PopulationType.MANUAL,
        file_path="placeholder",
        jinja_shape=jinja_shape
    )
    await db_session.commit()
    
    # Associate template
    association_data = AssociationCreate(
        template_id=template.id,
        order_index=0
    )
    await meeting_service.associate_template(meeting.id, association_data)
    
    # Submit first data
    await meeting_service.submit_manual_data(meeting.id, template.id, data1)
    
    # Verify first data is stored
    retrieved_data_1 = await meeting_service.get_filled_data(meeting.id, template.id)
    assert retrieved_data_1 == data1
    
    # Submit second data (update)
    await meeting_service.submit_manual_data(meeting.id, template.id, data2)
    
    # Verify second data completely replaced first data
    retrieved_data_2 = await meeting_service.get_filled_data(meeting.id, template.id)
    assert retrieved_data_2 == data2
    # Data should be replaced (idempotent update)
