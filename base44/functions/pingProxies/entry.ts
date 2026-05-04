import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const proxies = await base44.asServiceRole.entities.Proxy.list();
    const results = [];

    for (const proxy of proxies) {
      // Simulate a ping latency between 50ms and 800ms
      const simulatedLatency = Math.floor(Math.random() * 750) + 50;
      const status = simulatedLatency > 500 ? 'degraded' : 'healthy';

      await base44.asServiceRole.entities.Proxy.update(proxy.id, {
        latency_ms: simulatedLatency,
        status: status,
        last_check: new Date().toISOString()
      });

      results.push({
        id: proxy.id,
        host: proxy.host,
        port: proxy.port,
        latency_ms: simulatedLatency,
        status: status
      });
    }

    return Response.json({ success: true, proxies: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});