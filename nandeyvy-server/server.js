#!/usr/bin/env node
// Ñande Yvy — static site + JSON API
// From this folder: node server.js
// Open http://localhost:8787
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8787;
function findSite() {
  const candidates = [
    path.join(__dirname, "..", "inmopy"),
    path.join(__dirname, "inmopy"),
    path.join(process.cwd(), "inmopy"),
    path.join(process.cwd(), "nandeyvy-server", "inmopy"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "index.html"))) return c;
  }
  return candidates[0];
}
const ROOT = findSite();
const STORE = process.env.STORE_PATH || path.join(__dirname, "store.json");
const UP = path.join(__dirname, "uploads");
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true });
const FX = Number(process.env.FX_PYG || 7300);
console.log("site folder:", ROOT, "exists:", fs.existsSync(path.join(ROOT, "index.html")));
console.log("store:", STORE);

function empty() {
  return { listings: [], office: { name: "", city: "", agents: [] }, leads: [], users: [] };
}
let cache = empty();
let pool = null;
function load() { return cache; }
function loadFile() {
  try { return { ...empty(), ...JSON.parse(fs.readFileSync(STORE, "utf8")) }; }
  catch { return empty(); }
}
function save(s) {
  cache = s;
  try { fs.writeFileSync(STORE, JSON.stringify(s, null, 2)); } catch (e) { console.error("file save", e.message); }
  if (pool) {
    pool.query(
      "INSERT INTO ny_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1",
      [s]
    ).catch((e) => console.error("db save", e.message));
  }
}
async function initDb() {
  cache = loadFile();
  if (!process.env.DATABASE_URL) {
    console.log("no DATABASE_URL — using store.json only");
    return;
  }
  try {
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pool.query("CREATE TABLE IF NOT EXISTS ny_store (id int PRIMARY KEY, data jsonb)");
    const r = await pool.query("SELECT data FROM ny_store WHERE id = 1");
    if (r.rows[0] && r.rows[0].data) cache = { ...empty(), ...r.rows[0].data };
    else await pool.query("INSERT INTO ny_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [cache]);
    console.log("postgres connected, listings:", cache.listings.length);
  } catch (e) {
    console.error("postgres init failed, using file:", e.message);
    pool = null;
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json"
};

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  if (p === "/api/health" && req.method === "GET") {
    return send(res, 200, JSON.stringify({ ok: true, listings: load().listings.length }));
  }
  if (p === "/api/state" && req.method === "GET") {
    return send(res, 200, JSON.stringify(load()));
  }
  if (p === "/api/fx" && req.method === "GET") {
    return send(res, 200, JSON.stringify({ pygPerUsd: FX }));
  }
  if (p === "/api/photo" && req.method === "POST") {
    const body = await readBody(req);
    const dataUrl = String(body.dataUrl || "");
    const m = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!m) return send(res, 400, JSON.stringify({ error: "foto inválida" }));
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2_500_000) return send(res, 400, JSON.stringify({ error: "foto > 2.5 MB" }));
    const id = "ph-" + Date.now();
    const ext = m[1].toLowerCase() === "png" ? "png" : m[1].toLowerCase() === "webp" ? "webp" : "jpg";
    fs.writeFileSync(path.join(UP, id + "." + ext), buf);
    return send(res, 200, JSON.stringify({ url: "/uploads/" + id + "." + ext }));
  }
  if (p === "/api/pay" && req.method === "POST") {
    const body = await readBody(req);
    const plans = { usd12: 12, oficina29: 29, oficina49: 49 };
    const usd = plans[body.plan] || 12;
    const pyg = (usd * FX).toFixed(2);
    const shop = String(Date.now()).slice(-8);
    const pub = process.env.BANCARD_PUBLIC_KEY || "";
    const priv = process.env.BANCARD_PRIVATE_KEY || "";
    const apiBase = process.env.BANCARD_API_URL || "https://vpos.infonet.com.py:8888";
    if (!pub || !priv) {
      return send(res, 200, JSON.stringify({
        demo: true,
        usd, pyg, shop,
        message: "Faltan BANCARD_PUBLIC_KEY y BANCARD_PRIVATE_KEY en Render. Pago simulado."
      }));
    }
    const token = crypto.createHash("md5").update(priv + shop + pyg + pyg).digest("hex");
    const payload = JSON.stringify({
      public_key: pub,
      operation: {
        token,
        shop_process_id: Number(shop),
        currency: "PYG",
        amount: pyg,
        additional_data: "",
        description: "Ñande Yvy " + (body.plan || "aviso"),
        return_url: (process.env.PUBLIC_URL || "https://nandeyvy-2.onrender.com") + "/#/pagado",
        cancel_url: (process.env.PUBLIC_URL || "https://nandeyvy-2.onrender.com") + "/#/publicar"
      }
    });
    try {
      const bancard = await new Promise((resolve, reject) => {
        const u = new URL(apiBase + "/vpos/api/0.3/single_buy");
        const lib = u.protocol === "https:" ? https : http;
        const r = lib.request({
          hostname: u.hostname, port: u.port, path: u.pathname,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
        }, (resp) => {
          const chunks = [];
          resp.on("data", (c) => chunks.push(c));
          resp.on("end", () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); }
            catch { reject(new Error("bancard parse")); }
          });
        });
        r.on("error", reject);
        r.write(payload);
        r.end();
      });
      return send(res, 200, JSON.stringify({ demo: false, usd, pyg, shop, bancard, checkout: apiBase }));
    } catch (e) {
      return send(res, 502, JSON.stringify({ error: e.message, usd, pyg }));
    }
  }
  if (p.startsWith("/uploads/")) {
    const full = path.normalize(path.join(UP, path.basename(p)));
    return fs.readFile(full, (err, data) => {
      if (err) return send(res, 404, "not found", "text/plain");
      const ext = path.extname(full);
      send(res, 200, data, MIME[ext] || "application/octet-stream");
    });
  }
  if (p === "/api/listings" && req.method === "POST") {
    const item = await readBody(req);
    const s = load();
    if (!item.id) item.id = "SRV-" + Date.now().toString().slice(-6);
    if (item.img && String(item.img).startsWith("data:image")) {
      const m = String(item.img).match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (m) {
        const buf = Buffer.from(m[2], "base64");
        if (buf.length <= 2_500_000) {
          const id = "ph-" + item.id;
          const ext = m[1].toLowerCase() === "png" ? "png" : "jpg";
          fs.writeFileSync(path.join(UP, id + "." + ext), buf);
          item.img = "/uploads/" + id + "." + ext;
        }
      }
    }
    s.listings = [item, ...s.listings.filter((x) => x.id !== item.id)];
    save(s);
    return send(res, 200, JSON.stringify(item));
  }
  if (p === "/api/office" && req.method === "POST") {
    const office = await readBody(req);
    const s = load();
    s.office = office;
    save(s);
    return send(res, 200, JSON.stringify(office));
  }
  if (p === "/api/leads" && req.method === "POST") {
    const row = await readBody(req);
    const s = load();
    if (!row.id) row.id = "ld-" + Date.now();
    s.leads = [row, ...s.leads];
    save(s);
    return send(res, 200, JSON.stringify(row));
  }
  if (p === "/api/users" && req.method === "POST") {
    const u = await readBody(req);
    const s = load();
    if (s.users.some((x) => x.phone === u.phone)) return send(res, 409, JSON.stringify({ error: "exists" }));
    s.users.push(u);
    save(s);
    return send(res, 200, JSON.stringify({ name: u.name, phone: u.phone, role: u.role }));
  }
  if (p === "/api/login" && req.method === "POST") {
    const b = await readBody(req);
    const s = load();
    const u = s.users.find((x) => x.phone === b.phone && x.pin === b.pin);
    if (!u) return send(res, 401, JSON.stringify({ error: "bad" }));
    return send(res, 200, JSON.stringify({ name: u.name, phone: u.phone, role: u.role }));
  }

  let file = p === "/" ? "/index.html" : p;
  const full = path.normalize(path.join(ROOT, file));
  if (!full.startsWith(ROOT)) return send(res, 403, "forbidden", "text/plain");
  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, "not found", "text/plain");
    send(res, 200, data, MIME[path.extname(full)] || "application/octet-stream");
  });
});

initDb().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log("Ñande Yvy → http://localhost:" + PORT);
  });
});

