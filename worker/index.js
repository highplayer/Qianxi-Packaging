/**
 * Qianxi Packaging — 询盘后台（Cloudflare Worker + KV 存储版）
 *
 * 作用：接收网站表单 POST → 校验 + Honeypot 防垃圾 → 存入 Cloudflare KV。
 *       你可以随时用浏览器打开 GET /submissions 手动查看/复制全部 JSON 数据。
 *
 * 需要准备：
 *   1) 在 Cloudflare 创建一个 KV namespace（Workers & Pages → KV → Create）
 *   2) 绑定到本 Worker（Settings → Bindings → KV namespace → 绑定名必须叫 INQUIRIES）
 *   3) （推荐）在 Variables and Secrets 里设置 ACCESS_KEY 作为访问口令
 *
 * 用法：
 *   - 网站表单提交 → POST https://你的worker.workers.dev/
 *   - 手动查看数据 → GET  https://你的worker.workers.dev/submissions?key=你的ACCESS_KEY
 *   - 清空数据     → GET  https://你的worker.workers.dev/clear?key=你的ACCESS_KEY
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function isAuthorized(request, env) {
  // 如果没设置 ACCESS_KEY，则允许任何人访问；设置了则必须带 ?key=...
  if (!env.ACCESS_KEY) return true;
  const url = new URL(request.url);
  return url.searchParams.get('key') === env.ACCESS_KEY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // —— 手动拉取全部询盘（JSON）——
    if (request.method === 'GET' && url.pathname === '/submissions') {
      if (!isAuthorized(request, env)) return json({ error: 'Forbidden' }, 403);
      const list = await env.INQUIRIES.list({ prefix: 'sub:' });
      const items = [];
      for (const key of list.keys) {
        const value = await env.INQUIRIES.get(key.name, 'json');
        if (value) items.push(value);
      }
      items.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
      return json({ count: items.length, submissions: items });
    }

    // —— 清空全部询盘 ——
    if (request.method === 'GET' && url.pathname === '/clear') {
      if (!isAuthorized(request, env)) return json({ error: 'Forbidden' }, 403);
      const list = await env.INQUIRIES.list({ prefix: 'sub:' });
      await Promise.all(list.keys.map((k) => env.INQUIRIES.delete(k.name)));
      return json({ ok: true, cleared: list.keys.length });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    // —— 接收网站表单提交 ——
    try {
      const formData = await request.formData();
      const field = (name) => (formData.get(name) || '').toString().trim();

      // Honeypot：真人看不到，机器人会填。填了就静默丢弃。
      if (field('_gotcha')) {
        return json({ ok: true });
      }

      const name = field('name');
      const email = field('email');
      const phone = field('phone');
      const length = field('length');
      const width = field('width');
      const height = field('height');
      const material = field('material');
      const quantity = field('quantity');
      const customQuantity = field('customQuantity');
      const printing = field('printing');
      const budget = field('budget');
      const shipping = field('shipping');
      const message = field('message') || field('requirements');

      // 校验必填项
      if (!name || !email) return json({ error: 'Missing required fields' }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email' }, 400);

      const submission = {
        ts: new Date().toISOString(),
        name,
        email,
        phone,
        size: [length, width, height].filter(Boolean).join(' × '),
        material,
        quantity: quantity === 'custom' ? customQuantity || 'Custom' : quantity,
        printing,
        budget,
        shipping,
        message,
      };

      const key = `sub:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await env.INQUIRIES.put(key, JSON.stringify(submission));
      return json({ ok: true });
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Server error' }, 500);
    }
  },
};
