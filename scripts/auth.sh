#!/bin/bash

# Script to authenticate with Supabase and deploy database migrations
# This script handles login, project linking, and database deployment

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.local file
source .env.local



# Check if there's an active session and logout if needed
echo "🔄 Checking for active Supabase sessions..."
echo "y" | supabase logout

# Login with the access token
# GET ACCESS TOKEN : https://supabase.com/dashboard/account/tokens

echo "🔑 Logging in with access token..."
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Verify login was successful
if [ $? -eq 0 ]; then
    echo "✅ Login successful!"
else
    echo "❌ Login failed!"
    exit 1
fi

# Navigate to supabase directory
cd supabase

# Link the Supabase project
echo "🔗 Linking project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

# Check if linking was successful
if [ $? -eq 0 ]; then
    echo "✅ Project linked successfully!"
else
    echo "❌ Project linking failed!"
    exit 1
fi
