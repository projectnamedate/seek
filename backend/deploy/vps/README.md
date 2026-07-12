# Seek backend on the Mythx VPS

Production runs on the Helsinki Mythx VPS at `/opt/seek-api`.

- `compose.yaml` runs the API on `127.0.0.1:3001` and a dedicated Redis with a
  persistent Docker volume.
- `/opt/seek-api/.env` is root-readable mode `0600`. Never copy its values into
  Git, docs, chat, shell history, or temporary paths.
- Caddy proxies `api.seek.mythx.art` to the loopback API port.
- DNS is an A record for host `api.seek` under `mythx.art`, pointing to
  `204.168.242.220`.

## Verify

```bash
ssh helsinki 'sudo docker compose -f /opt/seek-api/compose.yaml ps'
curl -fsS https://api.seek.mythx.art/api/health/ready
curl -fsS https://api.seek.mythx.art/api/health/stats
```

Both containers must report healthy and readiness must show RPC, program, and
Redis checks as OK before the service is considered usable.

## Deploy

Validate locally first:

```bash
(cd backend && npx tsc --noEmit --pretty false)
(cd backend && npm run test:launch-tools)
```

Sync only the backend application and tracked Compose file. Preserve the remote
root-owned `.env`; do not recreate or print secrets during routine deploys.
Then rebuild the API and verify health:

```bash
rsync -az --delete --rsync-path='sudo rsync' \
  --exclude node_modules --exclude dist --exclude .env --exclude '.env.*' \
  --exclude .secrets backend/ helsinki:/opt/seek-api/app/
rsync -az --rsync-path='sudo rsync' \
  backend/deploy/vps/compose.yaml helsinki:/opt/seek-api/compose.yaml
ssh helsinki \
  'sudo docker compose -f /opt/seek-api/compose.yaml up -d --build api'
```

Do not finalize, cancel, resolve, fund, or otherwise sign for an on-chain
bounty as part of a normal infrastructure deploy.
