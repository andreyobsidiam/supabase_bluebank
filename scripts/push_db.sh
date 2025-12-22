#!/bin/bash

# Script to automate pushing the database to Supabase
# This script loads environment variables, navigates to the supabase directory,
# links the project, and pushes the database schema/migrations


# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (SISTEMAS_ANALITICOS_SUPABASE)
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.local file
source .env.production

# Link the Supabase project
supabase link --project-ref "$PROJECT_REF"

# Navigate to supabase directory
cd supabase

# Push the database to Supabase
supabase db push --yes 
