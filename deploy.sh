#!/usr/bin/env bash
set -euo pipefail

# Copies this project to a remote Docker host and (re)starts it with docker compose.
# Configure via environment variables or a .env.deploy file next to this script.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env.deploy"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST (e.g. user@host) in the environment or .env.deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/srv/docker}"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"
PROJECT_NAME="${PROJECT_NAME:-$(basename "$SCRIPT_DIR")}"

cd "$PROJECT_ROOT"

rm -rf \
  "$PROJECT_NAME/node_modules" \
  "$PROJECT_NAME/.mastra"

scp -r "$PROJECT_NAME" "${DEPLOY_HOST}:${DEPLOY_DIR}/"

ssh "$DEPLOY_HOST" "cd \"$DEPLOY_DIR\" && docker compose up -d --build \"$PROJECT_NAME\""
