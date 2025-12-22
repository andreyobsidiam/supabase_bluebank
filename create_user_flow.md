# Create User Flow

## Overview
The `create` action in the auth_manager function handles user registration by creating both an authentication account and a user profile.

## Steps

1. **Validate Input**
   - Required: `identifier` (email), `logon_id`, `password`
   - Optional: `name`, `phone_number`

2. **Check Logon ID Uniqueness**
   - Query profiles table to ensure `logon_id` doesn't already exist

3. **Create Auth Account**
   - Use Supabase auth to create user with email and password

4. **Sign In User**
   - Automatically sign in the newly created user to obtain session

5. **Create Profile Record**
   - Insert user profile into profiles table with:
     - `id`: Auth user ID
     - `email`: Identifier (email)
     - `logon_id`: Unique login identifier
     - `name`: Optional display name
     - `phone_number`: Optional phone number

6. **Verify Profile Creation**
   - Fetch the created profile to confirm success

## Success Response
```json
{
  "user": { /* auth user object */ },
  "session": { /* session object */ },
  "user_profile": { /* profile data */ },
  "message": "User created successfully"
}
```

## Error Cases
- Missing required fields
- Logon ID already exists
- Auth account creation failure
- Profile creation failure
- Profile fetch failure
