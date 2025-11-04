#!/bin/bash

# Script to deploy a specific Supabase Edge Function
# Usage: ./deploy_function.sh <function_name>
# This script loads environment variables, navigates to the supabase directory,
# and deploys the specified Edge Function

# Check if function name is provided
if [ -z "$1" ]; then
  echo "Usage: ./deploy_function.sh <function_name>"
  echo "Example: ./deploy_function.sh manage_users"
  exit 1
fi

FUNCTION_NAME=$1

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (SISTEMAS_ANALITICOS_SUPABASE)
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.local file
source .env.local

supabase link --project-ref "$PROJECT_REF"

# Navigate to supabase directory
cd supabase

echo "Deploying Supabase Edge Function: $FUNCTION_NAME"

# Deploy the specified function
supabase functions deploy $FUNCTION_NAME

if [ $? -ne 0 ]; then
  echo "Failed to deploy function: $FUNCTION_NAME"
  exit 1
fi

echo "Successfully deployed function: $FUNCTION_NAME"
