#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/Users/daniel/src"
PROJECT_NAME="treasure-or-trash"
REMOTE_HOST="df@192.168.86.59"
REMOTE_DIR="/srv/docker"

cd "$PROJECT_ROOT"

rm -rf \
  "$PROJECT_NAME/node_modules" \
  "$PROJECT_NAME/.mastra" \
  "$PROJECT_NAME/frontend/node_modules"

scp -r "$PROJECT_NAME" "${REMOTE_HOST}:${REMOTE_DIR}/"

ssh "$REMOTE_HOST" "cd \"$REMOTE_DIR\" && docker compose up -d --build \"$PROJECT_NAME\""
