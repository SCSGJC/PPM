# Create User Admin Function

This edge function allows administrators to create new user accounts directly, bypassing the registration process.

## Purpose

- Admins can create accounts for new employees
- Users are pre-approved and ready to use immediately
- Admins should manually provide login credentials to new users

## Usage

Called from the User Approval Manager interface when an admin creates a new user.

## Request

```json
{
  "email": "newuser@example.com",
  "password": "temporarypassword123",
  "fullName": "John Doe",
  "company": "SCS Ltd",
  "role": "viewer"
}
```

## Response

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com"
  }
}
```

## Security

- Requires valid JWT token
- Verifies user is an admin before allowing user creation
- Uses service role key to bypass RLS

## Deployment

**IMPORTANT**: This function must be deployed with JWT verification **DISABLED**.

When deploying in the Supabase Dashboard:
- Set "Verify JWT" to **OFF/FALSE**

The function performs its own JWT verification and admin checks. Supabase's automatic JWT verification interferes with the service role operations needed to create users.
