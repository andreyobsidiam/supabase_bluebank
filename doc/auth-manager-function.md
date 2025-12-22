# Auth Manager Function Documentation

## Overview

The Auth Manager function is a Supabase Edge Function that provides comprehensive authentication management supporting both login and user creation operations. It handles flexible authentication where users can login with either email or logon_id, and also supports creating new user accounts with custom logon_ids.

## API Endpoint

```
POST /functions/v1/auth_manager
```

## Authentication Flow

The function supports two main operations:

### Login Flow
1. **Input Validation**: Accepts `login` (email or logon_id) and `password`
2. **Database Lookup**: If login is not a valid email, queries the `profiles` table to find matching logon_id
3. **Supabase Authentication**: Uses the resolved email to authenticate with Supabase Auth
4. **Response**: Returns user session data on success

### Create Flow
1. **Input Validation**: Accepts `email`, `logon_id`, `password`, and optional profile data
2. **Duplicate Check**: Verifies logon_id doesn't already exist
3. **User Creation**: Creates Supabase auth user account
4. **Profile Creation**: Creates profile record with custom logon_id
5. **Response**: Returns user data and session

## TypeScript Interfaces

### AuthRequest
```typescript
interface AuthRequest {
  action: "login" | "create";  // Operation type
  login?: string;             // Required for login (email or logon_id)
  email?: string;             // Required for create
  logon_id?: string;          // Required for create
  password: string;           // Required for both
  name?: string;              // Optional for create
  phone_number?: string;      // Optional for create
}
```

### AuthResponse
```typescript
interface AuthResponse {
  user: any;           // Supabase user object
  session?: any;       // Supabase session object (present for login)
  message: string;     // Success message
}
```

### ErrorResponse
```typescript
interface ErrorResponse {
  error: string;       // Error description
}
```

## Request Examples

### Login with Email
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth_manager' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "login",
    "login": "user@example.com",
    "password": "userpassword"
  }'
```

### Login with Logon ID
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth_manager' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "login",
    "login": "user123",
    "password": "userpassword"
  }'
```

### Create New User
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth_manager' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create",
    "email": "newuser@example.com",
    "logon_id": "newuser123",
    "password": "securepassword",
    "name": "New User",
    "phone_number": "+1234567890"
  }'
```

## Response Examples

### Successful Login Response
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt-token-here",
    "refresh_token": "refresh-token-here",
    "expires_at": 1638360000
  },
  "message": "Login successful"
}
```

### Error Responses

#### Missing Login (400)
```json
{
  "error": "Login is required"
}
```

#### Missing Password (400)
```json
{
  "error": "Password is required"
}
```

#### Authentication Failed (401)
```json
{
  "error": "Invalid login credentials"
}
```

#### Logon ID Already Exists (409)
```json
{
  "error": "Logon ID already exists"
}
```

#### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

## Database Schema

The function relies on the following database table:

### profiles table
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  logon_id text,
  name text,
  email text,
  phone_number text,
  is_banned boolean DEFAULT false,
  banned_until timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

## Security Considerations

- **Service Role Key**: Uses Supabase service role key for database queries to bypass RLS
- **Input Validation**: Validates that exactly one of email or logon_id is provided
- **Password Requirements**: Ensures password is provided
- **CORS Support**: Includes proper CORS headers for web client access

## Environment Variables Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Error Handling

The function includes comprehensive error handling for:
- Invalid request data
- Database query failures
- Authentication failures
- Unexpected server errors

All errors return appropriate HTTP status codes and descriptive error messages.

## Deployment

Deploy using the provided script:
```bash
./scripts/deploy_function.sh auth_manager
```

## Testing

Test the function using tools like Postman, curl, or your frontend application. Ensure both email and logon_id authentication paths work correctly.
