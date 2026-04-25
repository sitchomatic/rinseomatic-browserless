import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NORD_API = 'https://api.nordvpn.com';
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function cleanKey(value) {
  return String(value || '')
    .replace(/\\\//g, '/')
    .replace(/^"|"$/g, '')
    .trim();
}

function normalizeCountry(value) {
  return String(value || '').trim().toLowerCase();
}

async function nordFetch(path, { token, retries = 2 } = {}) {
  let lastError = null;
  const cleanToken = token ? String(token).replace(/^token:/i, '').replace(/^bearer\s+/i, '').trim() : null;
  const authHeaders = cleanToken ? [`token:${cleanToken}`, `token ${cleanToken}`, `Bearer ${cleanToken}`] : [null];

  for (const authHeader of authHeaders) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(`${NORD_API}${path}`, {
          headers: {
            Accept: 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        });

        if (!response.ok) {
          const body = await response.text();
          const canTryNextAuth = authHeader !== authHeaders[authHeaders.length - 1] && (
            response.status === 400 || response.status === 401 || response.status === 403
          );
          if (canTryNextAuth) break;
          if (response.status === 401 || response.status === 403) {
            return { ok: false, status: response.status, error: 'NordVPN access token expired or unauthorized' };
          }
          if (RETRY_STATUSES.has(response.status) && attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
            continue;
          }
          return { ok: false, status: response.status, error: body || `NordVPN API error ${response.status}` };
        }

        return { ok: true, data: await response.json() };
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          continue;
        }
      }
    }
  }

  return { ok: false, status: 0, error: lastError?.message || 'NordVPN API unavailable' };
}

function extractCredentials(payload) {
  const service = Array.isArray(payload) ? payload[0] : payload;
  const credentials = service?.credentials || service || {};
  const nordlynxPrivateKey = cleanKey(credentials.nordlynx_private_key || service?.nordlynx_private_key);
  const username = credentials.username || service?.username;
  const password = credentials.password || service?.password;

  if (!nordlynxPrivateKey) throw new Error('NordLynx private key was not returned by NordVPN');

  return {
    nordlynx_private_key: nordlynxPrivateKey,
    service_username: username || null,
    service_password: password || null,
  };
}

function flattenCountries(countries = [], rows = []) {
  countries.forEach((country) => {
    rows.push({ id: country.id, name: country.name, code: country.code });
    if (Array.isArray(country.cities)) {
      country.cities.forEach((city) => rows.push({ id: country.id, name: city.name, code: country.code, city_id: city.id }));
    }
    if (Array.isArray(country.regions)) flattenCountries(country.regions, rows);
  });
  return rows;
}

function resolveCountryId(countries, country) {
  if (!country) return null;
  const needle = normalizeCountry(country);
  const rows = flattenCountries(countries);
  const match = rows.find((row) => normalizeCountry(row.code) === needle || normalizeCountry(row.name) === needle || String(row.id) === needle);
  return match?.id || null;
}

function pickBestServer(servers = []) {
  const candidates = servers
    .filter((server) => Number(server.load ?? 100) < 50)
    .sort((a, b) => {
      const loadDiff = Number(a.load ?? 100) - Number(b.load ?? 100);
      if (loadDiff !== 0) return loadDiff;
      return Number(a.distance ?? a.status ?? 0) - Number(b.distance ?? b.status ?? 0);
    });

  return candidates[0] || servers.sort((a, b) => Number(a.load ?? 100) - Number(b.load ?? 100))[0] || null;
}

function getWireGuardMeta(server) {
  const metadata = server?.technologies?.flatMap((technology) => technology?.metadata || []) || [];
  const publicKey = metadata.find((item) => item.name === 'public_key')?.value;
  const station = server?.station || server?.hostname;
  if (!publicKey || !station) throw new Error('Selected NordVPN server is missing WireGuard metadata');
  return { publicKey: cleanKey(publicKey), endpoint: `${station}:51820` };
}

function buildWireGuardConfig({ privateKey, server }) {
  const { publicKey, endpoint } = getWireGuardMeta(server);
  return [
    '[Interface]',
    `PrivateKey = ${privateKey}`,
    'Address = 10.5.0.2/32',
    'DNS = 103.86.96.100, 103.86.99.100',
    '',
    '[Peer]',
    `PublicKey = ${publicKey}`,
    'AllowedIPs = 0.0.0.0/0, ::/0',
    `Endpoint = ${endpoint}`,
    'PersistentKeepalive = 25',
  ].join('\n');
}

async function trace(base44, message, level = 'debug') {
  await base44.asServiceRole.entities.ActionLog.create({
    session_id: 'nordlynx-proxy-engine',
    level,
    category: 'proxy',
    message: String(message).slice(0, 1200),
    delta_ms: 0,
    timestamp: new Date().toISOString(),
    site: 'nordlynx',
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const token = Deno.env.get('NORDVPN_ACCESS_TOKEN');
    if (!token) return Response.json({ error: 'Missing NORDVPN_ACCESS_TOKEN secret' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const preferredCountry = body.country || body.country_code || 'US';
    await trace(base44, `CMD nordLynxProxyEngine start · country=${preferredCountry}`);

    await trace(base44, 'CMD nordLynxProxyEngine request · Nord credentials');
    const credentialsResponse = await nordFetch('/v1/users/services/credentials', { token });
    if (!credentialsResponse.ok) return Response.json({ error: credentialsResponse.error }, { status: credentialsResponse.status || 502 });
    const credentials = extractCredentials(credentialsResponse.data);

    await trace(base44, 'CMD nordLynxProxyEngine request · Nord countries');
    const countriesResponse = await nordFetch('/v1/servers/countries', { token: null });
    if (!countriesResponse.ok) return Response.json({ error: countriesResponse.error }, { status: countriesResponse.status || 502 });
    const countryId = resolveCountryId(countriesResponse.data, preferredCountry);

    const params = new URLSearchParams({
      limit: '30',
      filters: JSON.stringify({
        technologies: [{ identifier: 'wireguard_udp' }],
        ...(countryId ? { country_id: countryId } : {}),
      }),
    });
    await trace(base44, `CMD nordLynxProxyEngine request · server recommendations · country_id=${countryId || 'any'}`);
    const serversResponse = await nordFetch(`/v1/servers/recommendations?${params.toString()}`, { token: null });
    if (!serversResponse.ok) return Response.json({ error: serversResponse.error }, { status: serversResponse.status || 502 });

    const bestServer = pickBestServer(serversResponse.data || []);
    if (!bestServer) return Response.json({ error: 'No NordLynx-capable server available for the selected country' }, { status: 404 });

    const wireguardConfig = buildWireGuardConfig({
      privateKey: credentials.nordlynx_private_key,
      server: bestServer,
    });

    await trace(base44, `CMD nordLynxProxyEngine response · server=${bestServer.hostname || bestServer.name} · load=${bestServer.load}`, 'success');

    return Response.json({
      north_star: 'Headless-ready NordLynx IP management via SOCKS5 handoff',
      selected_country: preferredCountry,
      selected_country_id: countryId,
      server: {
        id: bestServer.id,
        name: bestServer.name,
        hostname: bestServer.hostname,
        station: bestServer.station,
        load: bestServer.load,
      },
      service_credentials: {
        username: credentials.service_username,
        password_available: !!credentials.service_password,
      },
      wireguard_config: wireguardConfig,
      browser_proxy: 'socks5://127.0.0.1:1080',
      cloud_bridge_command: 'wireguard-go wg-nord && wg setconf wg-nord nordlynx.conf && microsocks -i 127.0.0.1 -p 1080',
      hardening_log: [
        'Nord credentials are fetched with Authorization: token:<TOKEN> and never exposed to frontend code unless this admin function is explicitly invoked.',
        'Country selection resolves through Nord country/city metadata before recommendations are requested.',
        'Server choice prefers WireGuard UDP servers under 50% load, then falls back to lowest-load availability.',
        'WireGuard keys are sanitized for escaped slash artifacts before configuration synthesis.',
        'Base44 functions cannot host a persistent SOCKS5 daemon, so this function returns a complete cloud bridge handoff for a sidecar/container process.'
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});