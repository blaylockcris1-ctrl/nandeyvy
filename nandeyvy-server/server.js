#!/usr/bin/env node
// Ñande Yvy — static site + JSON API
// From this folder: node server.js
// Open http://localhost:8787
const http = require("http");
const fs = require("fs");
const path = require("path");

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
  if (p === "/api/listings" && req.method === "POST") {
    const item = await readBody(req);
    const s = load();
    if (!item.id) item.id = "SRV-" + Date.now().toString().slice(-6);
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
