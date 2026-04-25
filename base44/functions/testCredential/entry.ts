import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_SUCCESS_SELECTOR = '.ol-alert__content.ol-alert__content--status_success';

function classify(site, finalUrl, markerFound) {
  if (markerFound) return 'working';
  const loginMarker = site.login_url_marker || '/login';
  const successUrlContains = site.success_url_contains || '';
  if (loginMarker && finalUrl.includes(loginMarker)) return 'failed';
  if (successUrlContains && !finalUrl.includes(successUrlContains)) return 'failed';
  if (successUrlContains === '' && !markerFound) return 'failed';
  return 'working';
}

function buildBrowserlessUrl(apiKey, site, sessionTimeout, proxyTypeOverride) {
  const params = new URLSearchParams();
  params.set('token', apiKey);
  params.set('timeout', String(sessionTimeout));

  // Default to Australian residential proxy; callers can force a no-proxy fallback.
  const proxyType = proxyTypeOverride || site.proxy_type || 'residential';
  if (proxyType === 'residential') {
    params.set('proxy', 'residential');
    params.set('proxyCountry', String(site.proxy_country || 'au').trim().toLowerCase());
    if (site.proxy_city) params.set('proxyCity', String(site.proxy_city).trim());
    if (site.proxy_sticky !== false) params.set('proxySticky', 'true');
    if (site.proxy_locale_match !== false) params.set('proxyLocaleMatch', '1');
    if (site.proxy_preset) params.set('proxyPreset', site.proxy_preset);
  } else if (proxyType === 'external' && site.external_proxy_url) {
    params.set('externalProxyServer', site.external_proxy_url);
  }

  // Stealth & behavior toggles: default to safer Browserless settings for old records.
  if (site.stealth !== false) params.set('stealth', 'true');
  if (site.block_ads !== false) params.set('blockAds', 'true');
  if (site.block_consent_modals) params.set('blockConsentModals', 'true');
  if (site.headless === false) params.set('headless', 'false');
  if (site.accept_insecure_certs) params.set('acceptInsecureCerts', 'true');
  if (site.slow_mo_ms && site.slow_mo_ms > 0) params.set('slowMo', String(site.slow_mo_ms));

  // Launch JSON for args
  const args = [];
  if (site.viewport_width && site.viewport_height) {
    args.push(`--window-size=${site.viewport_width},${site.viewport_height}`);
  }
  if (Array.isArray(site.extra_chrome_args)) {
    for (const a of site.extra_chrome_args) if (a && typeof a === 'string') args.push(a);
  }
  if (args.length) {
    params.set('launch', JSON.stringify({ args }));
  }

  return `https://production-sfo.browserless.io/function?${params.toString()}`;
}

async function attemptLogin({ browserlessUrl, site, username, password }) {
  const waitMs = site.wait_after_submit_ms ?? 3500;
  const successSelector = site.success_selector || DEFAULT_SUCCESS_SELECTOR;
  const userSel = (site.username_selector || '#username').split(',')[0].trim();
  const passSel = (site.password_selector || '#password').split(',')[0].trim();
  const submitSel = (site.submit_selector || '#loginSubmit').split(',')[0].trim();
  const navTimeout = site.navigation_timeout_ms ?? 30000;
  const selTimeout = site.selector_timeout_ms ?? 10000;
  const typeDelay = site.type_delay_ms ?? 30;
  const waitUntil = site.wait_until || 'networkidle0';
  const vw = site.viewport_width || 1920;
  const vh = site.viewport_height || 1080;
  const userAgent = site.user_agent || '';
  const acceptLang = site.accept_language || '';

  const fnBody = `
    export default async ({ page }) => {
      const loginUrl = ${JSON.stringify(site.login_url)};
      const userSel = ${JSON.stringify(userSel)};
      const passSel = ${JSON.stringify(passSel)};
      const submitSel = ${JSON.stringify(submitSel)};
      const successSel = ${JSON.stringify(successSelector)};
      const waitMs = ${waitMs};
      const navTimeout = ${navTimeout};
      const selTimeout = ${selTimeout};
      const typeDelay = ${typeDelay};
      const waitUntil = ${JSON.stringify(waitUntil)};
      const userAgent = ${JSON.stringify(userAgent)};
      const acceptLang = ${JSON.stringify(acceptLang)};
      const user = ${JSON.stringify(username)};
      const pass = ${JSON.stringify(password)};

      await page.setViewport({ width: ${vw}, height: ${vh} });
      if (userAgent) await page.setUserAgent(userAgent);
      if (acceptLang) await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang });

      await page.goto(loginUrl, { waitUntil, timeout: navTimeout });

      await page.waitForSelector(userSel, { timeout: selTimeout });
      await page.click(userSel, { clickCount: 3 });
      await page.type(userSel, user, { delay: typeDelay });

      await page.waitForSelector(passSel, { timeout: selTimeout });
      await page.click(passSel, { clickCount: 3 });
      await page.type(passSel, pass, { delay: typeDelay });

      await page.waitForSelector(submitSel, { timeout: selTimeout });
      await page.click(submitSel);

      await new Promise(r => setTimeout(r, waitMs));

      const finalUrl = page.url();
      const markerFound = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, successSel);

      return { data: { finalUrl, markerFound } };
    };
  `;

  const res = await fetch(browserlessUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/javascript' },
    body: fnBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Browserless ${res.status}: ${errText.slice(0, 400)}` };
  }
  const result = await res.json();
  const { finalUrl, markerFound } = result?.data || result || {};
  return { finalUrl: finalUrl || '', markerFound: !!markerFound };
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { username, password, site_key, password_variants, custom_login_url } = body;

    if (!username || !password || !site_key) {
      return Response.json({ error: 'Missing username/password/site_key' }, { status: 400 });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: site_key });
    let site = sites[0];
    if (!site) return Response.json({ error: `Unknown site: ${site_key}` }, { status: 404 });
    if (site.enabled === false) return Response.json({ error: `Site ${site_key} is disabled` }, { status: 400 });

    if (custom_login_url) {
      if (!/^https?:\/\//i.test(custom_login_url)) return Response.json({ error: 'Custom login URL must be a valid http(s) URL' }, { status: 400 });
      const defaultHost = new URL(site.login_url).hostname.replace(/^www\./, '');
      const customHost = new URL(custom_login_url).hostname.replace(/^www\./, '');
      if (customHost !== defaultHost) return Response.json({ error: 'Custom login URL must use the configured site domain' }, { status: 400 });
      site = { ...site, login_url: custom_login_url };
    }

    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const sessionTimeout = (site.wait_after_submit_ms || 3500) + (site.navigation_timeout_ms || 30000) + 20000;
    const browserlessUrl = buildBrowserlessUrl(apiKey, site, sessionTimeout);

    // Try primary password, then variants until one works
    const passwords = [password, ...((password_variants || []).filter(Boolean))];
    let lastResult = null;
    let workingPassword = null;

    for (const pwd of passwords) {
      let r = await attemptLogin({ browserlessUrl, site, username, password: pwd });
      if (r.error && (site.proxy_type || 'residential') === 'residential') {
        const fallbackUrl = buildBrowserlessUrl(apiKey, site, sessionTimeout, 'none');
        const fallback = await attemptLogin({ browserlessUrl: fallbackUrl, site, username, password: pwd });
        if (!fallback.error) r = { ...fallback, proxy_fallback_used: true };
      }
      if (r.error) {
        return Response.json({ status: 'error', error_message: r.error, elapsed_ms: Date.now() - started }, { status: 500 });
      }
      const status = classify(site, r.finalUrl, r.markerFound);
      lastResult = { ...r, status };
      if (status === 'working') {
        workingPassword = pwd;
        break;
      }
    }

    return Response.json({
      status: lastResult.status,
      final_url: lastResult.finalUrl,
      success_marker_found: lastResult.markerFound,
      working_password: workingPassword && workingPassword !== password ? workingPassword : undefined,
      tried: passwords.length,
      proxy_fallback_used: !!lastResult.proxy_fallback_used,
      elapsed_ms: Date.now() - started,
    });

  } catch (error) {
    return Response.json({ status: 'error', error_message: error.message, elapsed_ms: Date.now() - started }, { status: 500 });
  }
});