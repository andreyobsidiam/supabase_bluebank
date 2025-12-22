# Auth Manager Errors

## General
- `action_must_be_login_or_create`: Invalid action parameter provided
- `invalid_action`: Action not recognized
- `internal_server_error`: Unexpected server error

## Login
- `identifier_is_required`: Identifier field is missing
- `password_is_required`: Password field is missing
- `no_user_found`: User identifier does not exist in database
- `invalid_login_credentials`: Incorrect password for existing user

## Create
- `identifier_logon_id_and_password_are_required_for_user_creation`: Required fields missing for user creation
- `logon_id_already_exists`: Logon ID is already taken
- `failed_to_create_user_profile`: Error creating user profile record
- `failed_to_fetch_created_user_profile`: Error retrieving newly created profile
