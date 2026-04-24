import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const defaults = {
  wait_after_submit_ms: 5000,
  wait_until: 'networkidle2',
  navigation_timeout_ms: 45000,
  selector_timeout_ms: 15000,
  type_delay_ms: 45,
  proxy_type: 'residential',
  proxy_country: 'au',
  proxy_sticky: true,
  proxy_locale_match: true,
  proxy_preset: '',
  stealth: true,
  block_ads: true,
  block_consent_modals: false,
  headless: true,
  slow_mo_ms: 100,
  accept_insecure_certs: false,
  viewport_width: 1920,
  viewport_height: 1080,
  accept_language: 'en-AU,en;q=0.9',
  extra_chrome_args: ['--lang=en-AU'],
  supported_strategies: ['form'],
  enabled: true,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sites = await base44.asServiceRole.entities.Site.list('-created_date', 100);
    const updated = [];

    for (const site of sites) {
      const patch = { ...defaults };
      if (site.key === 'ignition') {
        patch.login_url = site.login_url || 'https://www.ignitioncasino.ooo/login';
        patch.login_url_marker = '/login';
      }
      if (site.key === 'joe') {
        patch.login_url = site.login_url || 'https://www.joefortunepokies.EU/login';
        patch.login_url_marker = '/login';
      }
      const merged = {
        ...patch,
        key: site.key,
        label: site.label,
        login_url: patch.login_url || site.login_url,
        username_selector: site.username_selector || '#username',
        password_selector: site.password_selector || '#password',
        submit_selector: site.submit_selector || '#loginSubmit',
        success_selector: site.success_selector || '.ol-alert__content.ol-alert__content--status_success',
        success_url_contains: site.success_url_contains || '',
        login_url_marker: site.login_url_marker || '/login',
        proxy_type: site.proxy_type || patch.proxy_type,
        proxy_country: site.proxy_country || patch.proxy_country,
      };
      await base44.asServiceRole.entities.Site.update(site.id, merged);
      updated.push(site.key);
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});