module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // which profile page is counting: /yx, /wayne, ... (defaults to wayne)
  const raw = req.query && req.query.page ? String(req.query.page) : "wayne";
  const page = /^[a-z0-9-]{1,24}$/.test(raw) ? raw : "wayne";

  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!base || !token) {
    res.status(200).json({ views: null, counted: false, configured: false, page });
    return;
  }

  const KEY = `dxpe:${page}:views`;
  const cookie = `${page}_seen`;
  const cookies = req.headers.cookie || "";
  const seen = new RegExp(`(?:^|;\\s*)${cookie}=`).test(cookies);
  const peek = seen || (req.query && req.query.mode === "peek");

  const call = async (path) => {
    const r = await fetch(`${base}/${path}/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`kv ${r.status}`);
    const j = await r.json();
    return Number(j.result);
  };

  try {
    let views = 0;
    let counted = false;

    if (peek) {
      views = await call("get");
      if (!Number.isFinite(views)) views = 0;
    } else {
      views = await call("incr");
      if (!Number.isFinite(views)) {
        views = await call("get");
      } else {
        counted = true;
        res.setHeader(
          "Set-Cookie",
          `${cookie}=1; Max-Age=21600; Path=/; SameSite=Lax; Secure`,
        );
      }
    }

    res.status(200).json({
      views: Number.isFinite(views) ? views : 0,
      counted,
      configured: true,
      page,
    });
  } catch {
    res.status(200).json({
      views: null,
      counted: false,
      configured: true,
      page,
      error: "upstream",
    });
  }
};
