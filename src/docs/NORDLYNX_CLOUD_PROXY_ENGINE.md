# NordLynx Cloud Proxy Engine

## North Star
Headless-ready NordLynx IP management via a SOCKS5 browser proxy.

## What is implemented
- Fetches Nord service credentials with `Authorization: token:<TOKEN>`.
- Extracts and sanitizes `nordlynx_private_key`.
- Resolves country names/codes through Nord country metadata.
- Fetches WireGuard UDP server recommendations.
- Selects the best server by preferring `<50%` load and lowest-load fallback.
- Synthesizes a valid NordLynx WireGuard configuration.
- Returns a cloud-browser SOCKS5 bridge handoff using `wireguard-go` + `microsocks`.

## Function
`nordLynxProxyEngine`

Payload:
```json
{ "country": "US" }
```

Response includes:
- selected Nord server
- WireGuard config
- service username availability
- SOCKS5 browser proxy target: `socks5://127.0.0.1:1080`
- sidecar bridge command

## Cloud bridge reliability
Base44 backend functions are request/response serverless handlers and cannot safely run long-lived network daemons or host a persistent SOCKS5 port. The reliable cloud pattern is a sidecar/container process that runs:

```bash
wireguard-go wg-nord
wg setconf wg-nord nordlynx.conf
microsocks -i 127.0.0.1 -p 1080
```

Then point Playwright/Puppeteer/Browserless to:

```txt
socks5://127.0.0.1:1080
```

This keeps browser traffic isolated through the userspace WireGuard tunnel without modifying the app server's primary network route.