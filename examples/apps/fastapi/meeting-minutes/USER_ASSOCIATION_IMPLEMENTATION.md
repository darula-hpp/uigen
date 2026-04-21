# User Association Implementation

## Overview
This document describes the implementation of user authentication and resource ownership in the Meeting Minutes application.

## Changes Made

### 1. Database Schema Changes

#### Models Updated (`app/models.py`)
- **Template Model**: Added `user_id` foreign key column
  - Links templates to the user who created them
  - Cascade delete when user is deleted
  - Added relationship: `user = relationship("User", back_populates="templates")`

- **Meeting Model**: Added `user_id` foreign key column
  - Links meetings to the user who created them
  - Cascade delete when user is deleted
  - Added relationship: `user = relationship("User", back_populates="meetings")`

- **User Model**: Added relationships
  - `templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")`
  - `meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")`

#### Migration Created
- **File**: `alembic/versions/2026_04_21_0000-c8d9e2f3a4b5_add_user_id_to_resources.py`
- **Changes**:
  - Adds `user_id` column to `templates` table
  - Adds `user_id` column to `meetings` table
  - Creates foreign key constraints with CASCADE delete
  - Creates indexes on `user_id` columns
  - Migrates existing data to first user (for backward compatibility)
  - Sets columns to NOT NULL after data migration

### 2. Repository Layer Changes

#### Template Repository (`app/repositories/template_repository.py`)
- **create()**: Now requires `user_id` parameter
- **get_by_id()**: Added optional `user_id` parameter for ownership filtering
- **list_all()**: Added optional `user_id` parameter for ownership filtering
- **delete()**: Added optional `user_id` parameter for ownership verification

#### Meeting Repository (`app/repositories/meeting_repository.py`)
- **create()**: Now requires `user_id` parameter
- **get_by_id()**: Added optional `user_id` parameter for ownership filtering
- **list_all()**: Added optional `user_id` parameter for ownership filtering
- **update()**: Added optional `user_id` parameter for ownership verification
- **delete()**: Added optional `user_id` parameter for ownership verification

### 3. Service Layer Changes

#### Template Service (`app/services/template_service.py`)
- **upload_template()**: Now requires `user_id` parameter
- **get_template()**: Added optional `user_id` parameter
- **list_templates()**: Added optional `user_id` parameter
- **delete_template()**: Added optional `user_id` parameter

#### Meeting Service (`app/services/meeting_service.py`)
- **create_meeting()**: Now requires `user_id` parameter
- **get_meeting()**: Added optional `user_id` parameter
- **list_meetings()**: Added optional `user_id` parameter
- **update_meeting()**: Added optional `user_id` parameter
- **delete_meeting()**: Added optional `user_id` parameter

### 4. Router Layer Changes

#### Templates Router (`app/routers/templates.py`)
- Added `from app.dependencies.auth import get_current_user`
- Added `from app.models import User`
- All endpoints now require authentication via `current_user: User = Depends(get_current_user)`
- Endpoints pass `current_user.id` to service methods

#### Meetings Router (`app/routers/meetings.py`)
- Added authentication to all endpoints
- Endpoints verify user ownership before allowing operations
- Template association endpoints verify meeting ownership

#### Documents Router (`app/routers/documents.py`)
- Added authentication to all endpoints
- Verifies meeting ownership before document operations

### 5. Security Model

#### Access Control
- **Templates**: Users can only see, modify, and delete their own templates
- **Meetings**: Users can only see, modify, and delete their own meetings
- **Associations**: Users can only associate templates with their own meetings
- **Documents**: Users can only generate documents for their own meetings

#### Authentication Flow
1. User logs in via `/api/v1/auth/login` and receives JWT token
2. User includes token in `Authorization: Bearer <token>` header
3. `get_current_user` dependency validates token and retrieves user
4. Service layer filters resources by `user_id`
5. 404 returned if resource doesn't exist or doesn't belong to user

### 6. API Changes

#### Breaking Changes
All resource endpoints now require authentication:
- `POST /api/v1/templates` - Requires auth
- `GET /api/v1/templates` - Returns only user's templates
- `GET /api/v1/templates/{id}` - Returns only if user owns it
- `DELETE /api/v1/templates/{id}` - Deletes only if user owns it
- `POST /api/v1/meetings` - Requires auth
- `GET /api/v1/meetings` - Returns only user's meetings
- `GET /api/v1/meetings/{id}` - Returns only if user owns it
- `PUT /api/v1/meetings/{id}` - Updates only if user owns it
- `DELETE /api/v1/meetings/{id}` - Deletes only if user owns it
- All meeting sub-resources (templates, data, documents) - Require meeting ownership

#### OpenAPI Spec Updated
- `openapi.yaml` and `openapi.json` regenerated with authentication requirements
- All protected endpoints now show security requirements in documentation

## Testing the Implementation

### 1. Create a User
```bash
curl -X POST "http://localhost:8000/api/v1/auth/sign-up" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### 3. Create a Template (with auth)
```bash
curl -X POST "http://localhost:8000/api/v1/templates" \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@template.docx" \
  -F "name=My Template" \
  -F "population_type=manual"
```

### 4. List Templates (only yours)
```bash
curl -X GET "http://localhost:8000/api/v1/templates" \
  -H "Authorization: Bearer <your-token>"
```

### 5. Create a Meeting (with auth)
```bash
curl -X POST "http://localhost:8000/api/v1/meetings" \
  -H "Authorization: Bearer <your-token>" \
  -F "title=Team Meeting" \
  -F "datetime=2026-04-21T10:00:00Z"
```

## Migration Instructions

### For Existing Deployments

1. **Backup Database**
   ```bash
   docker-compose exec db pg_dump -U postgres meeting_minutes > backup.sql
   ```

2. **Run Migration**
   ```bash
   docker-compose exec app alembic upgrade head
   ```

3. **Verify Migration**
   ```bash
   docker-compose exec db psql -U postgres meeting_minutes -c "\d templates"
   docker-compose exec db psql -U postgres meeting_minutes -c "\d meetings"
   ```

4. **Test Authentication**
   - Create a test user
   - Login and get token
   - Try accessing resources with and without token

### For New Deployments

The migration will run automatically on first startup via the Docker entrypoint.

## Security Considerations

1. **JWT Tokens**: Tokens expire after 24 hours (configurable via `JWT_EXPIRATION_HOURS`)
2. **Password Hashing**: Uses bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`)
3. **Cascade Deletes**: When a user is deleted, all their resources are deleted
4. **Authorization**: All resource access is filtered by user_id
5. **404 vs 403**: Returns 404 for non-existent or unauthorized resources (prevents information leakage)

## Future Enhancements

1. **Sharing**: Allow users to share templates/meetings with other users
2. **Teams**: Group users into teams with shared resources
3. **Roles**: Add admin/user roles with different permissions
4. **Audit Log**: Track who accessed/modified resources
5. **Rate Limiting**: Prevent abuse of API endpoints

## Files Modified

- `app/models.py`
- `app/repositories/template_repository.py`
- `app/repositories/meeting_repository.py`
- `app/services/template_service.py`
- `app/services/meeting_service.py`
- `app/routers/templates.py`
- `app/routers/meetings.py`
- `app/routers/documents.py`
- `openapi.yaml`
- `openapi.json`

## Files Created

- `alembic/versions/2026_04_21_0000-c8d9e2f3a4b5_add_user_id_to_resources.py`
- `USER_ASSOCIATION_IMPLEMENTATION.md` (this file)
