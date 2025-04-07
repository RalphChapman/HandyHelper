#!/bin/bash
echo "Starting Google Calendar Refresh Token Helper..."
echo "This script will help you generate a new refresh token for Google Calendar integration."
echo "---------------------------------------------------------------------"
echo "You will need to:"
echo "1. Sign in with your Google account"
echo "2. Grant the requested permissions"
echo "3. Copy the new refresh token and update your environment variable"
echo "---------------------------------------------------------------------"
echo ""
echo "Press Enter to continue..."
read

# Run the helper script
npx tsx server/utils/refresh-token-helper.ts