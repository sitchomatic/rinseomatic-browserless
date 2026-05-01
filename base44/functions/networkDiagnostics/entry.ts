import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REQUIRED_SITE_DEFAULTS = {
  proxy_type: 'residential',
  proxy_country: 'au',
  proxy_sticky: true,
  proxy_locale_match: true,
  stealth: true,
  block_ads: true,
  wait_until: 'networkidle2',
  accept_language: 'en-AU,en;q=0.9',
  extra_chrome_args: ['--lang=en-AU'],
  navigation_timeout_ms: 45000,
  selector_timeout_ms: 15000,
  type_delay_ms: 45,
  wait_after_submit_ms: 5000,
};

function sitePatch(site) {
  const patch = {};
  for (const [key, value] of Object.entries(REQUIRED_SITE_DEFAULTS)) {
    if (Array.isArray(value)) {
      if (!Array.isArray(site[key]) || JSON.stringify(site[key]) !== JSON.stringify(value)) patch[key] = value;
    } else if (site[key] !== value) {
      patch[key] = value;
    }
  }
  if (site.enabled === false) patch.enabled = true;
  return patch;
}

async function checkBrowserless(apiKey) {
  if (!apiKey) return { ok: false, label: 'Browserless API key missing' };
  const started = Date.now();
  const response = await fetch(`https://production-sfo.browserless.io/json/version?token=${encodeURIComponent(apiKey)}`);
  return {
    ok: response.ok,
    label: response.ok ? 'Browserless reachable' : `Browserless returned ${response.status}`,
    latency_ms: Date.now() - started,
  };
}

async function checkNord(token, country) {
  if (!token) return { ok: false, label: 'NordVPN access token missing' };
  const started = Date.now();
  const cleanToken = String(token).replace(/^token:/i, '').replace(/^bearer\s+/i, '').trim();
  const headersToTry = [`Bearer ${cleanToken}`, `token:${cleanToken}`, `token ${cleanToken}`];
  let last = null;

  for (const authorization of headersToTry) {
    const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
      headers: { Accept: 'application/json', Authorization: authorization },
    });
    if (response.ok) {
      return { ok: true, label: `NordLynx credentials reachable for ${country}`, latency_ms: Date.now() - started };
    }
    last = { status: response.status, body: await response.text() };
  }

  return {
    ok: false,
    label: last?.status === 400 ? 'Nord token rejected: invalid authorization header' : `NordLynx check failed (${last?.status || 'network'})`,
    latency_ms: Date.now() - started,
    detail: last?.body?.slice(0, 240),
  };
}

async function trace(base44, message, level = 'debug') {
  await base44.asServiceRole.entities.ActionLog.create({
    session_id: 'network-diagnostics',
    level,
    category: 'network',
    message: String(message).slice(0, 1200),
    delta_ms: 0,
    timestamp: new Date().toISOString(),
    site: 'network',
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const shouldRepair = body.repair !== false;
    const country = body.country || 'AU';
    await trace(base44, `CMD networkDiagnostics start · repair=${shouldRepair} · country=${country}`);

    const sites = await base44.asServiceRole.entities.Site.list('-created_date', 100);
    const repairs = [];

    await trace(base44, `CMD networkDiagnostics loaded sites · count=${sites.length}`);

    if (shouldRepair) {
      for (const site of sites) {
        const patch = sitePatch(site);
        if (Object.keys(patch).length > 0) {
          await trace(base44, `CMD networkDiagnostics repair site · site=${site.key} · fields=${Object.keys(patch).join(',')}`, 'warn');
          await base44.asServiceRole.entities.Site.update(site.id, patch);
          repairs.push({ site_key: site.key, fields: Object.keys(patch) });
        }
      }
    }

    const repairedSites = shouldRepair && repairs.length > 0
      ? await base44.asServiceRole.entities.Site.list('-created_date', 100)
      : sites;

    const siteChecks = repairedSites.map((site) => ({
      site_key: site.key,
      label: site.label,
      ok: site.proxy_type === 'residential' && String(site.proxy_country || '').toLowerCase() === 'au' && site.stealth !== false && site.enabled !== false,
      proxy: `${site.proxy_type || 'none'}:${site.proxy_country || 'any'}`,
      locale: site.accept_language || 'unset',
    }));

    let browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
    let nordKey = Deno.env.get('NORDVPN_ACCESS_TOKEN');
    try {
      const bSecrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'BROWSERLESS_API_KEY' });
      if (bSecrets.length > 0) browserlessKey = bSecrets[0].value;
      const nSecrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'NORDVPN_ACCESS_TOKEN' });
      if (nSecrets.length > 0) nordKey = nSecrets[0].value;
    } catch (e) {}

    await trace(base44, 'CMD networkDiagnostics external checks start · browserless+nordlynx');
    const [browserless, nordlynx] = await Promise.all([
      checkBrowserless(browserlessKey),
      checkNord(nordKey, country),
    ]);

    const checks = [browserless, nordlynx, ...siteChecks.map((site) => ({ ok: site.ok, label: `${site.label} AU proxy defaults`, detail: `${site.proxy} · ${site.locale}` }))];
    const okCount = checks.filter((check) => check.ok).length;

    const status = okCount === checks.length ? 'healthy' : repairs.length > 0 ? 'healed' : 'attention';
    await trace(base44, `CMD networkDiagnostics response · status=${status} · healthy=${okCount}/${checks.length} · repairs=${repairs.length}`, status === 'healthy' ? 'success' : 'warn');

    return Response.json({
      status,
      checked_at: new Date().toISOString(),
      summary: `${okCount}/${checks.length} checks healthy`,
      checks,
      repairs,
      sites: siteChecks,
      browserless,
      nordlynx,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});