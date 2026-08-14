#!/bin/sh
set -eu

cd "$(dirname "$0")"
# A missing bind-mount source is created by the daemon and owned by root.
mkdir -p .runtime/node_modules .runtime/astro .runtime/dist .runtime/wrangler .runtime/npm .runtime/config
# Via .env, so plain `docker compose` calls outside this script resolve it too.
printf 'DOCKER_USER=%s:%s\n' "$(id -u)" "$(id -g)" > .env
# A renamed service leaves its old container running and holding the port.
docker compose down --remove-orphans

# For the IDE only, and only sound while install scripts stay off: then npm ci unpacks
# tarballs and executes no package code. Without npm the stand still runs.
if command -v npm > /dev/null; then
  if ! grep -qx 'ignore-scripts=true' .npmrc; then
    echo 'dev.sh: .npmrc must set ignore-scripts=true before npm may run on the host' >&2
    exit 1
  fi
  npm ci --ignore-scripts
fi

docker compose up --build
