#!/bin/bash

# Script to unban all banned IPs from Supabase project
# This script gets the list of banned IPs and unbans them all

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project root
cd "$SCRIPT_DIR/.."

# Load environment variables
if [ -f ".env.production" ]; then
    source .env.production
else
    echo -e "${RED}Error: .env.production file not found${NC}"
    exit 1
fi

# Check if PROJECT_REF is set
if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: PROJECT_REF not found in .env.production${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Getting list of banned IPs for project: $PROJECT_REF${NC}"

# Get banned IPs
BANNED_IPS=$(supabase network-bans get --project-ref "$PROJECT_REF" --experimental 2>/dev/null || echo "")

if [ -z "$BANNED_IPS" ]; then
    echo -e "${GREEN}✅ No banned IPs found or command failed${NC}"
    exit 0
fi

echo -e "${YELLOW}📋 Raw output from network-bans get:${NC}"
echo "$BANNED_IPS"
echo ""

# Extract IPs from the output (both IPv4 and IPv6)
# The output format is: DB banned IPs: [ip1,ip2,...]
IPS_TO_UNBAN=$(echo "$BANNED_IPS" | sed 's/.*\[\([^]]*\)\].*/\1/' | tr ',' '\n' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' || echo "")

if [ -z "$IPS_TO_UNBAN" ]; then
    echo -e "${GREEN}✅ No valid IPs found to unban${NC}"
    exit 0
fi

echo -e "${BLUE}🚫 Found banned IPs:${NC}"
echo "$IPS_TO_UNBAN"
echo ""

# Count IPs
IP_COUNT=$(echo "$IPS_TO_UNBAN" | wc -l | tr -d ' ')
echo -e "${YELLOW}📊 Total IPs to unban: $IP_COUNT${NC}"
echo ""

# Confirm before proceeding
echo -e "${RED}⚠️  WARNING: This will unban $IP_COUNT IP addresses${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}❌ Operation cancelled${NC}"
    exit 0
fi

# Unban each IP
UNBANED_COUNT=0
FAILED_COUNT=0

echo -e "${BLUE}🔓 Starting to unban IPs...${NC}"
echo ""

for IP in $IPS_TO_UNBAN; do
    echo -e "${YELLOW}🔓 Unbanning IP: $IP${NC}"

    # Try to unban the IP
    if supabase network-bans remove --db-unban-ip "$IP" --project-ref "$PROJECT_REF" --experimental 2>/dev/null; then
        echo -e "${GREEN}✅ Successfully unbanned: $IP${NC}"
        ((UNBANED_COUNT++))
    else
        echo -e "${RED}❌ Failed to unban: $IP${NC}"
        ((FAILED_COUNT++))
    fi

    # Small delay to avoid rate limiting
    sleep 1
done

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "${GREEN}✅ Successfully unbanned: $UNBANED_COUNT IPs${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}❌ Failed to unban: $FAILED_COUNT IPs${NC}"
fi

echo ""
echo -e "${GREEN}🎉 IP unban process completed!${NC}"

# Verify no IPs are banned anymore
echo ""
echo -e "${BLUE}🔍 Verifying no IPs are banned...${NC}"
REMAINING_BANS=$(supabase network-bans get --project-ref "$PROJECT_REF" --experimental 2>/dev/null | grep -c -E '^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[0-9a-fA-F:]+)' || echo "0")

if [ "$REMAINING_BANS" -eq 0 ]; then
    echo -e "${GREEN}✅ All IPs have been successfully unbanned!${NC}"
else
    echo -e "${YELLOW}⚠️  Still $REMAINING_BANS IP(s) banned. You may need to run the script again.${NC}"
fi
