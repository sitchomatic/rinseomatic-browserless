import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import puppeteer from 'npm:puppeteer-core@24.0.0';

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

function buildBrowserlessParams(apiKey, site, sessionTimeout, proxyTypeOverride) {
  const params = new URLSearchParams();
  params.set('token', apiKey);
  params.set('timeout', String(sessionTimeout));

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

  if (site.stealth !== false) params.set('stealth', 'true');
  if (site.block_ads !== false) params.set('blockAds', 'true');
  if (site.block_consent_modals) params.set('blockConsentModals', 'true');
  if (site.headless === false) params.set('headless', 'false');
  if (site.accept_insecure_certs) params.set('acceptInsecureCerts', 'true');
  if (site.slow_mo_ms && site.slow_mo_ms > 0) params.set('slowMo', String(site.slow_mo_ms));

  const args = [];
  if (site.viewport_width && site.viewport_height) args.push(`--window-size=${site.viewport_width},${site.viewport_height}`);
  if (Array.isArray(site.extra_chrome_args)) {
    for (const a of site.extra_chrome_args) if (a && typeof a === 'string') args.push(a);
  }
  if (args.length) params.set('launch', JSON.stringify({ args }));
  return params;
}

function buildBrowserlessUrl(apiKey, site, sessionTimeout, proxyTypeOverride) {
  return `https://production-sfo.browserless.io/function?${buildBrowserlessParams(apiKey, site, sessionTimeout, proxyTypeOverride).toString()}`;
}

function buildBrowserlessWsUrl(apiKey, site, sessionTimeout, recordingMode, proxyTypeOverride) {
  const params = buildBrowserlessParams(apiKey, site, sessionTimeout, proxyTypeOverride);
  params.set('headless', 'false');
  if (recordingMode === 'replay') params.set('replay', 'true');
  if (recordingMode === 'video') params.set('record', 'true');
  return `wss://production-sfo.browserless.io?${params.toString()}`;
}

async function uploadScreenshot(base44, shot, context) {
  if (!shot?.base64) return null;
  const binary = Uint8Array.from(atob(shot.base64), (char) => char.charCodeAt(0));
  const safeStep = String(shot.step_label || 'screenshot').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const file = new File([binary], `${context.run_id || 'manual'}-${context.result_id || crypto.randomUUID()}-${safeStep}.png`, { type: 'image/png' });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return base44.asServiceRole.entities.Screenshot.create({
    session_id: context.run_id || context.result_id || 'manual',
    run_id: context.run_id || null,
    result_id: context.result_id || null,
    credential_id: context.credential_id || null,
    username: context.username,
    site: context.site_key,
    step_label: shot.step_label,
    step_index: shot.step_index || 0,
    image_url: uploaded.file_url,
    captured_at: new Date().toISOString(),
  });
}

async function saveRecording(base44, result, context) {
  if (!context.run_id || !context.result_id || !result.recording_mode) return;
  let videoUrl = '';
  if (result.videoBinary?.byteLength) {
    const file = new File([result.videoBinary], `${context.run_id}-${context.result_id}.webm`, { type: 'video/webm' });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    videoUrl = uploaded.file_url;
  }
  await base44.asServiceRole.entities.RunRecording.create({
    run_id: context.run_id,
    result_id: context.result_id,
    credential_id: context.credential_id || null,
    username: context.username,
    site: context.site_key,
    mode: result.recording_mode,
    dashboard_url: result.recording_mode === 'replay' ? (context.recording_dashboard_url || 'https://account.browserless.io/session-replay') : '',
    video_url: videoUrl,
    note: result.recording_mode === 'replay'
      ? 'Replay is available in the Browserless dashboard after the session finishes.'
      : (videoUrl ? 'WebM video stored in this app.' : 'Video recording was requested, but Browserless did not return a video file.'),
    captured_at: new Date().toISOString(),
  });
}

async function saveEvidence(base44, result, context) {
  const mode = result.debugReport?.screenshot_mode || 'key_steps';
  const shouldStoreShots = mode !== 'failures' || result.status === 'failed' || result.status === 'error';
  const shots = shouldStoreShots && Array.isArray(result.screenshots) ? result.screenshots : [];
  await Promise.all(shots.map((shot) => uploadScreenshot(base44, shot, context)));
  await saveRecording(base44, result, context);
  if (context.run_id && context.result_id) {
    await base44.asServiceRole.entities.AutomationDebugReport.create({
      run_id: context.run_id,
      result_id: context.result_id,
      credential_id: context.credential_id || null,
      site: context.site_key,
      username: context.username,
      status: result.status || 'error',
      final_url: result.finalUrl || '',
      report_json: JSON.stringify(result.debugReport || {}, null, 2),
      captured_at: new Date().toISOString(),
    });
  }
}

function shouldCaptureScreenshot(mode, stepIndex) {
  if (mode === 'off') return false;
  if (mode === 'final') return stepIndex === 4;
  return true;
}

function decodeRecordingValue(value) {
  if (!value) return null;
  const text = String(value);
  const base64 = text.startsWith('data:') ? text.split(',').pop() : text;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(base64) && base64.length > 64) {
    try {
      return Uint8Array.from(atob(base64.replace(/\s/g, '')), (char) => char.charCodeAt(0));
    } catch (_) {}
  }
  return Uint8Array.from(text, (char) => char.charCodeAt(0) & 255);
}

async function v7PerformLoginOnPage(page, site, username, passwords, recordingMode, screenshotMode = 'key_steps') {
  const userSel = (site.username_selector || '#username').split(',')[0].trim();
  const passSel = (site.password_selector || '#password').split(',')[0].trim();
  const submitSel = (site.submit_selector || '#loginSubmit').split(',')[0].trim();
  const navTimeout = site.navigation_timeout_ms ?? 30000;
  const selTimeout = site.selector_timeout_ms ?? 10000;
  const waitMs = site.wait_after_submit_ms ?? 4500;
  const waitUntil = site.wait_until || 'networkidle0';
  const vw = site.viewport_width || 1920;
  const vh = site.viewport_height || 1080;
  const userAgent = site.user_agent || '';
  const acceptLang = site.accept_language || '';

  await page.setViewport({ width: vw, height: vh });
  if (userAgent) await page.setUserAgent(userAgent);
  if (acceptLang) await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang });

  const cdp = recordingMode ? await page.createCDPSession() : null;
  let recordingStarted = false;
  if (recordingMode === 'video') {
    await cdp.send('Browserless.startRecording');
    recordingStarted = true;
  }

  const screenshots = [];
  const debugReport = { steps: [], started_at: new Date().toISOString(), login_url: site.login_url, recording_mode: recordingMode || 'none', screenshot_mode: screenshotMode };
  
  const capture = async (step_label, step_index) => {
    const url = page.url();
    const title = await page.title().catch(() => '');
    const base64 = shouldCaptureScreenshot(screenshotMode, step_index)
      ? await page.screenshot({ encoding: 'base64', fullPage: false }).catch(() => null)
      : null;
    debugReport.steps.push({ step_label, step_index, url, title, captured_at: new Date().toISOString(), screenshot: !!base64, screenshot_mode: screenshotMode });
    if (base64) screenshots.push({ step_label, step_index, base64 });
  };

  await page.goto(site.login_url, { waitUntil, timeout: navTimeout });
  await capture('01 V7 page loaded', 1);

  await page.waitForSelector(userSel, { visible: true, timeout: selTimeout });
  await page.waitForSelector(passSel, { visible: true, timeout: selTimeout });
  await page.waitForSelector(submitSel, { visible: true, timeout: selTimeout });

  let finalUrl = page.url();
  let markerFound = false;
  let workingPassword = null;
  let earlyStop = false;
  let earlyStopReason = '';

  for (let i = 0; i < passwords.length; i++) {
    const pass = passwords[i];
    
    await page.click(userSel, { clickCount: 3 });
    await page.type(userSel, username, { delay: Math.floor(Math.random() * 100) + 50 });
    
    await page.click(passSel, { clickCount: 3 });
    await page.type(passSel, pass, { delay: Math.floor(Math.random() * 100) + 50 });
    
    await capture('02 V7 creds entered attempt ' + (i+1), 2 + (i*10));
    
    await page.click(submitSel);
    
    await new Promise(r => setTimeout(r, i === 0 ? 400 : 700));
    await capture('03 V7 post-submit attempt ' + (i+1), 3 + (i*10));
    
    await new Promise(r => setTimeout(r, waitMs));
    
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (pageText.includes('disabled')) {
      earlyStop = true;
      earlyStopReason = 'disabled';
      break;
    }
    if (!pageText.includes('incorrect password') && !pageText.includes('invalid email') && !pageText.includes('error')) {
      markerFound = true;
      workingPassword = pass;
      break;
    }
  }

  finalUrl = page.url();
  
  let videoBinary = null;
  if (recordingMode === 'video' && recordingStarted) {
    const response = await cdp.send('Browserless.stopRecording').catch(() => null);
    videoBinary = decodeRecordingValue(response?.value || '');
  }
  if (recordingMode === 'replay') await cdp.send('Browserless.stopSessionRecording').catch(() => null);
  await cdp?.detach().catch(() => null);

  debugReport.finished_at = new Date().toISOString();
  debugReport.final_url = finalUrl;
  debugReport.success_marker_found = markerFound;
  debugReport.v7_active = true;

  return { finalUrl, markerFound, screenshots, debugReport, recording_mode: recordingMode || '', videoBinary, workingPassword, earlyStop, earlyStopReason, v7_active: true };
}

async function v7AttemptLoginWithRecording({ browserlessWsUrl, site, username, passwords, recordingMode, screenshotMode }) {
  const browser = await puppeteer.connect({ browserWSEndpoint: browserlessWsUrl, protocolTimeout: 90000 });
  try {
    const page = await browser.newPage();
    return await v7PerformLoginOnPage(page, site, username, passwords, recordingMode, screenshotMode);
  } finally {
    await browser.close().catch(() => null);
  }
}

async function v7AttemptLogin({ browserlessUrl, site, username, passwords, screenshotMode = 'key_steps' }) {
  const userSel = (site.username_selector || '#username').split(',')[0].trim();
  const passSel = (site.password_selector || '#password').split(',')[0].trim();
  const submitSel = (site.submit_selector || '#loginSubmit').split(',')[0].trim();
  const waitMs = site.wait_after_submit_ms ?? 4500;

  const fnBody = `
    export default async ({ page }) => {
      const loginUrl = ${JSON.stringify(site.login_url)};
      const userSel = ${JSON.stringify(userSel)};
      const passSel = ${JSON.stringify(passSel)};
      const submitSel = ${JSON.stringify(submitSel)};
      const waitMs = ${waitMs};
      const navTimeout = ${site.navigation_timeout_ms ?? 30000};
      const selTimeout = ${site.selector_timeout_ms ?? 10000};
      const waitUntil = ${JSON.stringify(site.wait_until || 'networkidle0')};
      const vw = ${site.viewport_width || 1920};
      const vh = ${site.viewport_height || 1080};
      const userAgent = ${JSON.stringify(site.user_agent || '')};
      const acceptLang = ${JSON.stringify(site.accept_language || '')};
      const user = ${JSON.stringify(username)};
      const passwords = ${JSON.stringify(passwords)};
      const screenshotMode = ${JSON.stringify(screenshotMode)};

      await page.setViewport({ width: vw, height: vh });
      if (userAgent) await page.setUserAgent(userAgent);
      if (acceptLang) await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang });

      const screenshots = [];
      const shouldCaptureScreenshot = (mode, stepIndex) => {
        if (mode === 'off') return false;
        if (mode === 'final') return stepIndex >= 4;
        return true;
      };
      const debugReport = { steps: [], started_at: new Date().toISOString(), login_url: loginUrl, recording_mode: 'none', screenshot_mode: screenshotMode };
      const capture = async (step_label, step_index) => {
        const url = page.url();
        const title = await page.title().catch(() => '');
        const base64 = shouldCaptureScreenshot(screenshotMode, step_index)
          ? await page.screenshot({ encoding: 'base64', fullPage: false }).catch(() => null)
          : null;
        debugReport.steps.push({ step_label, step_index, url, title, captured_at: new Date().toISOString(), screenshot: !!base64, screenshot_mode: screenshotMode });
        if (base64) screenshots.push({ step_label, step_index, base64 });
      };

      await page.goto(loginUrl, { waitUntil, timeout: navTimeout });
      await capture('01 V7 page loaded', 1);

      await page.waitForSelector(userSel, { visible: true, timeout: selTimeout });
      await page.waitForSelector(passSel, { visible: true, timeout: selTimeout });
      await page.waitForSelector(submitSel, { visible: true, timeout: selTimeout });

      let finalUrl = page.url();
      let markerFound = false;
      let workingPassword = null;
      let earlyStop = false;
      let earlyStopReason = '';

      for (let i = 0; i < passwords.length; i++) {
        const pass = passwords[i];
        
        await page.click(userSel, { clickCount: 3 });
        await page.type(userSel, user, { delay: Math.floor(Math.random() * 100) + 50 });
        
        await page.click(passSel, { clickCount: 3 });
        await page.type(passSel, pass, { delay: Math.floor(Math.random() * 100) + 50 });
        
        await capture('02 V7 creds entered attempt ' + (i+1), 2 + (i*10));
        
        await page.click(submitSel);
        
        await new Promise(r => setTimeout(r, i === 0 ? 400 : 700));
        await capture('03 V7 post-submit attempt ' + (i+1), 3 + (i*10));
        
        await new Promise(r => setTimeout(r, waitMs));
        
        const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
        if (pageText.includes('disabled')) {
          earlyStop = true;
          earlyStopReason = 'disabled';
          break;
        }
        if (!pageText.includes('incorrect password') && !pageText.includes('invalid email') && !pageText.includes('error')) {
          markerFound = true;
          workingPassword = pass;
          break;
        }
      }

      finalUrl = page.url();
      debugReport.finished_at = new Date().toISOString();
      debugReport.final_url = finalUrl;
      debugReport.success_marker_found = markerFound;
      debugReport.v7_active = true;
      
      return { data: { finalUrl, markerFound, screenshots, debugReport, workingPassword, earlyStop, earlyStopReason, v7_active: true }, type: 'application/json' };
    };
  `;

  const res = await fetch(browserlessUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/javascript' },
    body: fnBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Browserless V7 ${res.status}: ${errText.slice(0, 400)}` };
  }
  const result = await res.json();
  const { finalUrl, markerFound, screenshots, debugReport, workingPassword, earlyStop, earlyStopReason, v7_active } = result?.data || result || {};
  return { finalUrl: finalUrl || '', markerFound: !!markerFound, screenshots: screenshots || [], debugReport: debugReport || {}, workingPassword, earlyStop, earlyStopReason, v7_active };
}

async function legacyPerformLoginOnPage(page, site, username, password, recordingMode, screenshotMode = 'key_steps') {
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

  await page.setViewport({ width: vw, height: vh });
  if (userAgent) await page.setUserAgent(userAgent);
  if (acceptLang) await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLang });

  const cdp = recordingMode ? await page.createCDPSession() : null;
  let recordingStarted = false;
  if (recordingMode === 'video') {
    await cdp.send('Browserless.startRecording');
    recordingStarted = true;
  }

  const screenshots = [];
  const debugReport = { steps: [], started_at: new Date().toISOString(), login_url: site.login_url, recording_mode: recordingMode || 'none', screenshot_mode: screenshotMode };
  const capture = async (step_label, step_index) => {
    const url = page.url();
    const title = await page.title().catch(() => '');
    const base64 = shouldCaptureScreenshot(screenshotMode, step_index)
      ? await page.screenshot({ encoding: 'base64', fullPage: false }).catch(() => null)
      : null;
    debugReport.steps.push({ step_label, step_index, url, title, captured_at: new Date().toISOString(), screenshot: !!base64, screenshot_mode: screenshotMode });
    if (base64) screenshots.push({ step_label, step_index, base64 });
  };

  await page.goto(site.login_url, { waitUntil, timeout: navTimeout });
  await capture('01 login page loaded', 1);
  await page.waitForSelector(userSel, { timeout: selTimeout });
  await page.click(userSel, { clickCount: 3 });
  await page.type(userSel, username, { delay: typeDelay });
  await capture('02 username entered', 2);
  await page.waitForSelector(passSel, { timeout: selTimeout });
  await page.click(passSel, { clickCount: 3 });
  await page.type(passSel, password, { delay: typeDelay });
  await capture('03 password entered', 3);
  await page.waitForSelector(submitSel, { timeout: selTimeout });
  await page.click(submitSel);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  await capture('04 after submit', 4);

  const finalUrl = page.url();
  const markerFound = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, successSelector);

  let videoBinary = null;
  if (recordingMode === 'video' && recordingStarted) {
    const response = await cdp.send('Browserless.stopRecording').catch(() => null);
    videoBinary = decodeRecordingValue(response?.value || '');
  }
  if (recordingMode === 'replay') await cdp.send('Browserless.stopSessionRecording').catch(() => null);
  await cdp?.detach().catch(() => null);

  debugReport.finished_at = new Date().toISOString();
  debugReport.final_url = finalUrl;
  debugReport.success_marker_found = markerFound;
  return { finalUrl, markerFound, screenshots, debugReport, recording_mode: recordingMode || '', videoBinary };
}

async function legacyAttemptLoginWithRecording({ browserlessWsUrl, site, username, password, recordingMode, screenshotMode }) {
  const browser = await puppeteer.connect({ browserWSEndpoint: browserlessWsUrl, protocolTimeout: 90000 });
  try {
    const page = await browser.newPage();
    return await legacyPerformLoginOnPage(page, site, username, password, recordingMode, screenshotMode);
  } finally {
    await browser.close().catch(() => null);
  }
}

async function legacyAttemptLogin({ browserlessUrl, site, username, password, screenshotMode = 'key_steps' }) {
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

  const screenshotModeLiteral = JSON.stringify(screenshotMode);
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

      const screenshots = [];
      const screenshotMode = ${screenshotModeLiteral};
      const shouldCaptureScreenshot = (mode, stepIndex) => {
        if (mode === 'off') return false;
        if (mode === 'final') return stepIndex === 4;
        return true;
      };
      const debugReport = { steps: [], started_at: new Date().toISOString(), login_url: loginUrl, recording_mode: 'none', screenshot_mode: screenshotMode };
      const capture = async (step_label, step_index) => {
        const url = page.url();
        const title = await page.title().catch(() => '');
        const base64 = shouldCaptureScreenshot(screenshotMode, step_index)
          ? await page.screenshot({ encoding: 'base64', fullPage: false }).catch(() => null)
          : null;
        debugReport.steps.push({ step_label, step_index, url, title, captured_at: new Date().toISOString(), screenshot: !!base64, screenshot_mode: screenshotMode });
        if (base64) screenshots.push({ step_label, step_index, base64 });
      };

      await page.goto(loginUrl, { waitUntil, timeout: navTimeout });
      await capture('01 login page loaded', 1);

      await page.waitForSelector(userSel, { timeout: selTimeout });
      await page.click(userSel, { clickCount: 3 });
      await page.type(userSel, user, { delay: typeDelay });
      await capture('02 username entered', 2);

      await page.waitForSelector(passSel, { timeout: selTimeout });
      await page.click(passSel, { clickCount: 3 });
      await page.type(passSel, pass, { delay: typeDelay });
      await capture('03 password entered', 3);

      await page.waitForSelector(submitSel, { timeout: selTimeout });
      await page.click(submitSel);

      await new Promise(r => setTimeout(r, waitMs));
      await capture('04 after submit', 4);

      const finalUrl = page.url();
      const markerFound = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, successSel);

      debugReport.finished_at = new Date().toISOString();
      debugReport.final_url = finalUrl;
      debugReport.success_marker_found = markerFound;
      return { data: { finalUrl, markerFound, screenshots, debugReport }, type: 'application/json' };
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
  const { finalUrl, markerFound, screenshots, debugReport } = result?.data || result || {};
  return { finalUrl: finalUrl || '', markerFound: !!markerFound, screenshots: screenshots || [], debugReport: debugReport || {} };
}

async function trace(base44, sessionId, message, level = 'debug', site = 'credential-test') {
  await base44.asServiceRole.entities.ActionLog.create({
    session_id: sessionId || 'test-credential',
    level,
    category: 'auth',
    message: String(message).slice(0, 1200),
    delta_ms: 0,
    timestamp: new Date().toISOString(),
    site,
  }).catch(() => {});
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { username, password, site_key, password_variants, custom_login_url, run_id, result_id, credential_id, screenshot_mode, recording_mode } = body;
    await trace(base44, run_id || result_id, `CMD testCredential start · site=${site_key || 'missing'} · username=${username || 'missing'} · variants=${(password_variants || []).length} · screenshots=${screenshot_mode || 'default'} · recording=${recording_mode || 'none'}`, 'debug', site_key || 'credential-test');

    if (!username || !password || !site_key) {
      return Response.json({ error: 'Missing username/password/site_key' }, { status: 400 });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: site_key });
    let site = sites[0];
    if (!site) return Response.json({ error: `Unknown site: ${site_key}` }, { status: 404 });
    if (site.enabled === false) return Response.json({ error: `Site ${site_key} is disabled` }, { status: 400 });

    await trace(base44, run_id || result_id, `CMD testCredential loaded site · login_url=${site.login_url} · proxy=${site.proxy_type || 'none'}:${site.proxy_country || 'any'}`, 'debug', site_key);

    if (custom_login_url) {
      if (!/^https?:\/\//i.test(custom_login_url)) return Response.json({ error: 'Custom login URL must be a valid http(s) URL' }, { status: 400 });
      const defaultHost = new URL(site.login_url).hostname.replace(/^www\./, '');
      const customHost = new URL(custom_login_url).hostname.replace(/^www\./, '');
      if (customHost !== defaultHost) return Response.json({ error: 'Custom login URL must use the configured site domain' }, { status: 400 });
      site = { ...site, login_url: custom_login_url };
    }

    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const sessionTimeout = 60000;
    const browserlessUrl = buildBrowserlessUrl(apiKey, site, sessionTimeout);

    // Combine primary and variant passwords
    const passwords = [password, ...((password_variants || []).filter(Boolean))];
    let lastResult = null;
    let workingPassword = null;
    let fallbackToLegacy = false;

    const selectedRecordingMode = ['replay', 'video'].includes(recording_mode) ? recording_mode : '';
    const selectedScreenshotMode = ['off', 'final', 'failures', 'key_steps'].includes(screenshot_mode) ? screenshot_mode : 'key_steps';

    // PRIMARY LAYER: V7-V9 Logic
    try {
      await trace(base44, run_id || result_id, `CMD testCredential V7 starting · variants=${passwords.length}`, 'debug', site_key);
      const browserlessWsUrl = selectedRecordingMode ? buildBrowserlessWsUrl(apiKey, site, sessionTimeout, selectedRecordingMode) : '';
      
      let r = selectedRecordingMode
        ? await v7AttemptLoginWithRecording({ browserlessWsUrl, site, username, passwords, recordingMode: selectedRecordingMode, screenshotMode: selectedScreenshotMode })
        : await v7AttemptLogin({ browserlessUrl, site, username, passwords, screenshotMode: selectedScreenshotMode });

      if (r.error && (site.proxy_type || 'residential') === 'residential') {
        await trace(base44, run_id || result_id, `CMD testCredential V7 primary proxy failed · retrying without proxy · error=${r.error}`, 'warn', site_key);
        const fallbackUrl = buildBrowserlessUrl(apiKey, site, sessionTimeout, 'none');
        const fallbackWsUrl = selectedRecordingMode ? buildBrowserlessWsUrl(apiKey, site, sessionTimeout, selectedRecordingMode, 'none') : '';
        const fallback = selectedRecordingMode
          ? await v7AttemptLoginWithRecording({ browserlessWsUrl: fallbackWsUrl, site, username, passwords, recordingMode: selectedRecordingMode, screenshotMode: selectedScreenshotMode })
          : await v7AttemptLogin({ browserlessUrl: fallbackUrl, site, username, passwords, screenshotMode: selectedScreenshotMode });
        if (!fallback.error) r = { ...fallback, proxy_fallback_used: true };
      }

      if (r.error) throw new Error(r.error);

      // V7 early-stop rules evaluate permanent bans directly
      const status = r.earlyStop ? 'failed' : classify(site, r.finalUrl, r.markerFound);
      
      lastResult = { ...r, status, error_message: r.earlyStopReason || '' };
      workingPassword = r.workingPassword;
      
      await trace(base44, run_id || result_id, `CMD testCredential V7 response · status=${lastResult.status} · marker=${!!r.markerFound} · earlyStop=${!!r.earlyStop} · final_url=${r.finalUrl || ''}`, lastResult.status === 'working' ? 'success' : 'warn', site_key);
      await saveEvidence(base44, lastResult, { run_id, result_id, credential_id, username, site_key, recording_dashboard_url: body.recording_dashboard_url });

    } catch (e) {
      await trace(base44, run_id || result_id, `CMD testCredential V7 failed · error=${e.message} · activating legacy fallback`, 'error', site_key);
      fallbackToLegacy = true;
    }

    // SECONDARY FALLBACK LAYER: Legacy State
    if (fallbackToLegacy) {
      for (const pwd of passwords) {
        await trace(base44, run_id || result_id, `CMD testCredential LEGACY attempt · password_index=${passwords.indexOf(pwd) + 1}/${passwords.length}`, 'debug', site_key);
        const browserlessWsUrl = selectedRecordingMode ? buildBrowserlessWsUrl(apiKey, site, sessionTimeout, selectedRecordingMode) : '';
        
        let r = selectedRecordingMode
          ? await legacyAttemptLoginWithRecording({ browserlessWsUrl, site, username, password: pwd, recordingMode: selectedRecordingMode, screenshotMode: selectedScreenshotMode })
          : await legacyAttemptLogin({ browserlessUrl, site, username, password: pwd, screenshotMode: selectedScreenshotMode });
          
        if (r.error && (site.proxy_type || 'residential') === 'residential') {
          await trace(base44, run_id || result_id, `CMD testCredential LEGACY primary proxy failed · retrying without proxy`, 'warn', site_key);
          const fallbackUrl = buildBrowserlessUrl(apiKey, site, sessionTimeout, 'none');
          const fallbackWsUrl = selectedRecordingMode ? buildBrowserlessWsUrl(apiKey, site, sessionTimeout, selectedRecordingMode, 'none') : '';
          const fallback = selectedRecordingMode
            ? await legacyAttemptLoginWithRecording({ browserlessWsUrl: fallbackWsUrl, site, username, password: pwd, recordingMode: selectedRecordingMode, screenshotMode: selectedScreenshotMode })
            : await legacyAttemptLogin({ browserlessUrl: fallbackUrl, site, username, password: pwd, screenshotMode: selectedScreenshotMode });
          if (!fallback.error) r = { ...fallback, proxy_fallback_used: true };
        }
        
        if (r.error) {
          return Response.json({ status: 'error', error_message: r.error, elapsed_ms: Date.now() - started }, { status: 500 });
        }
        
        const status = classify(site, r.finalUrl, r.markerFound);
        lastResult = { ...r, status, legacy_fallback_used: true };
        
        await trace(base44, run_id || result_id, `CMD testCredential LEGACY response · status=${status} · marker=${!!r.markerFound}`, status === 'working' ? 'success' : 'warn', site_key);
        await saveEvidence(base44, lastResult, { run_id, result_id, credential_id, username, site_key, recording_dashboard_url: body.recording_dashboard_url });
        
        if (status === 'working') {
          workingPassword = pwd;
          break;
        }
      }
    }

    await trace(base44, run_id || result_id, `CMD testCredential complete · status=${lastResult.status} · v7_active=${!fallbackToLegacy} · elapsed=${Date.now() - started}ms`, lastResult.status === 'working' ? 'success' : 'warn', site_key);

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