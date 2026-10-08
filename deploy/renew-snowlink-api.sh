#!/bin/sh
# Run from launchd; renew only this API certificate and reload after a renewal.
set -eu

docker_bin=${DOCKER_BIN:-/usr/local/bin/docker}
infra_dir=${SNOWLINK_INFRA_DIR:-/Users/snowfall/orca/cbt_bank/infra}
renewed_marker="$infra_dir/certbot/www/.snowlink-api-renewed"

"$docker_bin" info --format '{{.ServerVersion}}' >/dev/null
"$docker_bin" run --rm --name snowlink-api-cert-renew \
  -v "$infra_dir/certbot/conf:/etc/letsencrypt" \
  -v "$infra_dir/certbot/www:/var/www/certbot" \
  certbot/certbot renew --non-interactive --quiet \
  --cert-name api.snowlink.team \
  --deploy-hook 'touch /var/www/certbot/.snowlink-api-renewed' "$@"

if [ -f "$renewed_marker" ]; then
  "$docker_bin" exec cbt-nginx nginx -t
  "$docker_bin" exec cbt-nginx nginx -s reload
  rm "$renewed_marker"
fi
