#!/bin/bash

# Script to deploy all Supabase Edge Functions
# This script loads environment variables, navigates to the supabase directory,
# and deploys all available Edge Functions

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root (SUPABASE_ATM)
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.local file
source .env.production

supabase link --project-ref "$PROJECT_REF"


# Navigate to supabase directory
cd supabase

echo "Starting deployment of all Supabase Edge Functions..."
echo "Functions will be deployed in dependency order:"
echo ""

# Define deployment order based on logical dependencies:
# 1. email_provider_config - Authentication setup
# 2. manage_password_policies - System policies
# 3. manage_report_status - Status catalog management
# 4. manage_banks - Bank entities
# 5. manage_locations - Geographic locations
# 6. manage_atms - ATM inventory (depends on banks & locations)
# 7. manage_users - User management (depends on banks)

FUNCTIONS_ORDER=(
    "manage_users"
    "manage_locations"
    "manage_password_policies"
    "manage_report_status"
    "manage_banks"
    "manage_atms"
    "manage_failure_types"
    "manage_reports"
    "manage_report_templates"
    "dashboard_metrics"
    "manage_notifications"
    "send_push_notification"
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
