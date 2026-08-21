/**
 * Qianxi Packaging — 询盘后台（Cloudflare Worker）
 *
 * 作用：接收网站表单的 POST → 校验 + Honeypot 防垃圾 → 通过 Resend 把询盘发到你的邮箱。
 *
 * 部署后在 Cloudflare 控制台（Worker → Settings → Variables and Secrets）设置两个秘密变量：
 *   RESEND_API_KEY : Resend 的 API key（re_xxx，在 https://resend.com/api-keys 获取）
 *   TO_EMAIL       : 接收询盘的邮箱，例如 sales@qianxipackaging.com
 * 可选变量：
 *   FROM_EMAIL     : 发件人地址（需在 Resend 验证过你的域名），默认 noreply@qianxipack.com
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    try {
      const formData = await request.formData();
      const field = (name) => (formData.get(name) || '').toString().trim();

      // 1) Honeypot：真人看不到这个隐藏字段，机器人会自动填。填了就静默丢弃。
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

      // 2) 校验必填项
      if (!name || !email) {
        return json({ error: 'Missing required fields' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'Invalid email' }, 400);
      }

      const qty = quantity === 'custom' ? customQuantity || 'Custom' : quantity;
      const size = [length, width, height].filter(Boolean).join(' × ');

      // 3) 组装邮件正文
      const rows = [
        ['姓名 Name', name],
        ['邮箱 Email', email],
        ['电话 Phone', phone || '-'],
        ['尺寸 Size (mm)', size || '-'],
        ['材质 Material', material || '-'],
        ['数量 Quantity', qty || '-'],
        ['印刷 Printing', printing || '-'],
        ['预算 Budget', budget || '-'],
        ['运输 Shipping', shipping || '-'],
        ['留言 Message', message || '-'],
      ]
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap;">${label}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;color:#111827;">${escapeHtml(value)}</td></tr>`
        )
        .join('');

      const html = `
        <div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;">
          <h2 style="color:#1e3a5f;margin:0 0 12px;">网站新询盘 Website Inquiry</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows}</table>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">来自 qianxipack.com 网站表单 · ${new Date().toISOString()}</p>
        </div>`;

      // 4) 通过 Resend 发送邮件
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Qianxi Packaging <${env.FROM_EMAIL || 'noreply@qianxipack.com'}>`,
          to: [env.TO_EMAIL],
          reply_to: email,
          subject: `[网站询盘] ${name} — ${email}`,
          html,
        }),
      });

      if (resendRes.ok) {
        return json({ ok: true });
      }
      console.error('Resend error:', await resendRes.text());
      return json({ error: 'Failed to send email' }, 502);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Server error' }, 500);
    }
  },
};
