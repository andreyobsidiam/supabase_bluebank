#!/bin/bash

# Script to deploy all Supabase Edge Functions
# This script loads environment variables, navigates to the supabase directory,
# and deploys all available Edge Functions

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (SUPABASE_ATM)
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.local file
source .env.local

# Navigate to supabase directory
cd supabase

echo "Starting deployment of all Supabase Edge Functions..."
echo "Functions will be deployed in dependency order:"
echo ""


FUNCTIONS_ORDER=(
    "send-otp"
    "sumsub-proxy"
)

FAILED_DEPLOYS=()

for function_name in "${FUNCTIONS_ORDER[@]}"; do
    echo "🔄 Deploying: $function_name"
    echo "    Command: supabase functions deploy $function_name"

    # Deploy the function
    supabase functions deploy "$function_name"

    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy: $function_name"
        FAILED_DEPLOYS+=("$function_name")
    else
        echo "✅ Successfully deployed: $function_name"
    fi

    echo "───────────────────────────────────────────────────────"
    echo ""
done

# Summary
echo "Deployment completed."

if [ ${#FAILED_DEPLOYS[@]} -ne 0 ]; then
    echo "Failed deployments:"
    for failed in "${FAILED_DEPLOYS[@]}"; do
        echo "  - $failed"
    done
    exit 1
else
    echo "All functions deployed successfully."
fi
