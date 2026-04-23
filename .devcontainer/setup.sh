#!/usr/bin/env bash
# Generates .env.local from Codespace secrets (environment variables).
# Only writes variables that are actually set, skipping empty ones.

set -euo pipefail

ENV_FILE=".env.local"

declare -a VARS=(
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "NEXT_PUBLIC_API_URL"
  "API_SECRET"
  "NEXT_PUBLIC_DEFAULT_ENTITY_ID"
  "ADMIN_EMAILS"
  "DOCTOR_EMAILS"
)

if [ -f "$ENV_FILE" ]; then
  echo ".env.local already exists, skipping generation."
  exit 0
fi

echo "# Auto-generated from Codespace secrets" > "$ENV_FILE"

for var in "${VARS[@]}"; do
  val="${!var:-}"
  if [ -n "$val" ]; then
    echo "${var}=${val}" >> "$ENV_FILE"
  fi
done

echo "Generated $ENV_FILE with available secrets."
