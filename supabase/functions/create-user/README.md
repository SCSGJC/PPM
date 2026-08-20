# Create User Edge Function

This edge function allows admin users to create new users in the system.

## Purpose

Admin users can call this function to:
- Create new user accounts with email/password authentication
- Set user roles (admin, project_engineer, foreman, viewer)
- Automatically approve new users
- Add user profile data (full name, company, etc.)

## Authentication

This function requires:
1. Valid session token in Authorization header
2. The calling user must be an admin (is_admin = true)

## Request

**Method:** POST

**Headers:**
- `Authorization: Bearer {session_token}`
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "company": "Company Name",
  "role": "viewer"
}
```

**Parameters:**
- `email` (required): User's email address
- `password` (required): User's password (min 6 characters)
- `fullName` (required): User's full name
- `company` (optional): User's company name
- `role` (optional): User role - one of: admin, project_engineer, foreman, viewer (default: viewer)

## Response

**Success (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `401 Unauthorized`: No auth token or invalid token
- `403 Forbidden`: User is not an admin
- `400 Bad Request`: Missing required fields or user already exists

## Deployment

Deploy this function using the Supabase CLI:

```bash
npx supabase functions deploy create-user
```

Or deploy via Supabase Dashboard:
1. Go to Edge Functions in your Supabase project
2. Create new function named "create-user"
3. Copy the contents of index.ts
4. Deploy

## Testing

You can test this function from your application:
1. Log in as an admin user
2. Navigate to Settings > User Approvals
3. Click "Create New User"
4. Fill out the form and submit

The function is automatically called by the AdminUserCreation component.
