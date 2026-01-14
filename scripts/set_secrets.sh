#!/bin/bash

# Script to set Supabase Edge Function secrets from .env.local
# This ensures all necessary environment variables are available in the cloud

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Load environment variables from .env.local
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "Loading variables from .env.local..."
  # Export variables while ignoring comments and empty lines
  export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
else
  echo "Error: .env.local not found in $PROJECT_ROOT"
  exit 1
fi

echo "Setting Supabase secrets..."

supabase secrets set \
  SMTP_HOSTNAME="$SMTP_HOSTNAME" \
  SMTP_PORT="$SMTP_PORT" \
  SMTP_USERNAME="$SMTP_USERNAME" \
  SMTP_PASSWORD="$SMTP_PASSWORD" \
  SMTP_SENDER="$SMTP_SENDER" \
  NOTIFICATION_EMAIL="$NOTIFICATION_EMAIL"

if [ $? -eq 0 ]; then
  echo "Successfully set all secrets from .env.local."
else
  echo "Failed to set secrets."
  exit 1
fi
