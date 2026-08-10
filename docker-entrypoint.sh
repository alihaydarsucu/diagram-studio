#!/bin/sh
set -eu

: "${DIAGRAM_STUDIO_AUTH_USER:=Ali Haydar}"

if [ -z "${DIAGRAM_STUDIO_PASSWORD:-}" ]; then
  echo "DIAGRAM_STUDIO_PASSWORD must be set before starting Diagram Studio" >&2
  exit 1
fi

htpasswd -bB -c /etc/nginx/.htpasswd "$DIAGRAM_STUDIO_AUTH_USER" "$DIAGRAM_STUDIO_PASSWORD" >/dev/null
exec nginx -g 'daemon off;'
