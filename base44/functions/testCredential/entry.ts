import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { chromium } from 'npm:playwright-core@1.49.1';

const DEFAULT_SUCCESS_SELECTOR = '.ol-alert__content.ol-alert__content--status_success';

function classify(site, finalUrl, markerFound) {
  const loginMarker = site.login_url_marker || '/login';
  const successUrlContains = site.success_url_contains;

  const urlOkByMarker = loginMarker ? !finalUrl.includes(loginMarker) : true;
  const urlOkByContains = successUrlContains ? finalUrl.includes(successUrlContains) : true;
  const urlChanged = urlOkByMarker && urlOkByContains;

  if (urlChanged || markerFound) return 'working';
  return 'failed';
}

Deno.serve(async (req) => {
  let browser = null;
  const started = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { username, password, site_key } = body;
    if (!username || !password || !site_key) {
      return Response.json({ error: 'Missing username/password/site_key' }, { status: 400 });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: site_key });
    const site = sites[0];
    if (!site) return Response.json({ error: `Unknown site: ${site_key}` }, { status: 404 });

    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const waitMs = site.wait_after_submit_ms || 3500;
    const successSelector = site.success_selector || DEFAULT_SUCCESS_SELECTOR;
    const usernameSelector = site.username_selector || "input[type='email'], input[name='username']";
    const passwordSelector = site.password_selector || "input[type='password']";
    const submitSelector = site.submit_selector || "button[type='submit']";
    const loginUrl = site.login_url;

    // Connect to Browserless via CDP (each call consumes one concurrency slot)
    const sessionTimeout = waitMs + 45000; // buffer for page load + interaction
    const BROWSERLESS_WS = `wss://production-sfo.browserless.io?token=${apiKey}&timeout=${sessionTimeout}`;

    browser = await chromium.connectOverCDP(BROWSERLESS_WS);
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector(usernameSelector, { timeout: 10000 });
    await page.type(usernameSelector, username, { delay: 40 });

    await page.waitForSelector(passwordSelector, { timeout: 10000 });
    await page.type(passwordSelector, password, { delay: 40 });

    await page.click(submitSelector);

    // Wait for JS/navigation to settle
    await new Promise(r => setTimeout(r, waitMs));

    const finalUrl = page.url();
    const markerFound = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, successSelector);

    const status = classify(site, finalUrl, markerFound);
    const elapsed = Date.now() - started;

    return Response.json({ status, final_url: finalUrl, success_marker_found: markerFound, elapsed_ms: elapsed });

  } catch (error) {
    return Response.json({ status: 'error', error_message: error.message, elapsed_ms: Date.now() - started }, { status: 500 });
  } finally {
    // CRITICAL: always close browser to free the Browserless concurrency slot
    if (browser) await browser.close();
  }
});