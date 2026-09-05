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
const STORE = path.join(__dirname, "store.json");
console.log("site folder:", ROOT, "exists:", fs.existsSync(path.join(ROOT, "index.html")));

function empty() {
  return { listings: [], office: { name: "", city: "", agents: [] }, leads: [], users: [] };
}
function load() {
  try { return { ...empty(), ...JSON.parse(fs.readFileSync(STORE, "utf8")) }; }
  catch { return empty(); }
}
function save(s) { fs.writeFileSync(STORE, JSON.stringify(s, null, 2)); }

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

server.listen(PORT, "0.0.0.0", () => {
  console.log("Ñande Yvy → http://localhost:" + PORT);
});
