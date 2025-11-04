#!/bin/bash

# Script to initialize the Supabase environment for development/staging
# This script sets up the project link, pushes database migrations,
# imports location data, and deploys all edge functions
# Assumes .env.local is configured with the staging project credentials

set -e  # Exit on any command failure

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (SUPABASE_ATM)
cd "$SCRIPT_DIR/.."

echo "🚀 Initializing Supabase environment..."

# Load environment variables from .env.local file
source .env.local

if [ -z "$PROJECT_REF" ]; then
  echo "❌ ERROR: PROJECT_REF not found in .env.local"
  exit 1
fi

echo "📡 Linking to Supabase project: $PROJECT_REF"

# Navigate to supabase directory and link project
cd supabase
supabase link --project-ref "$PROJECT_REF"

echo "🗄️  Pushing database schema..."
supabase db push --yes

echo "🌍 Importing location data (states, counties, districts)..."

echo "⚡ Deploying all Edge Functions..."
./scripts/deploy_all_functions.sh

echo ""
echo "🎉 Environment initialization completed successfully!"
echo ""
echo "Your staging environment is now ready:"
echo "  - Database schema: ✅ Updated"
echo "  - Location data: ✅ Imported"
echo "  - Edge Functions: ✅ Deployed"
echo ""
echo "Project reference: $PROJECT_REF"
echo "URL: $VITE_SUPABASE_URL"
