const $ = (s, r = document) => r.querySelector(s);
const API_BASE = (localStorage.getItem("ny_api") || "").replace(/\/$/, "");
const HAS_API = !!(API_BASE || location.protocol === "http:" || location.protocol === "https:");
let REMOTE = { listings: [], office: { name: "", city: "", agents: [] }, leads: [], users: [] };

async function api(path, body) {
  if (!HAS_API) return null;
  const url = (API_BASE || "") + path;
  try {
    const opt = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
    const r = await fetch(url, opt);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function boot() {
  if (HAS_API) {
    const s = await api("/api/state");
    if (s) {
      REMOTE = s;
      const n = document.querySelector(".proto-note");
      if (n) n.textContent = "Ñande Yvy · servidor conectado · avisos compartidos USA / Paraguay";
    }
  }
  render();
}

function fmtPrice(item) {
  if (item.currency === "USD") {
    const gs = Math.round(item.price * FX);
    return { main: `USD ${item.price.toLocaleString("en-US")}`, sub: `≈ Gs. ${gs.toLocaleString("es-PY")}` };
  }
  const usd = Math.round(item.price / FX);
  return { main: `Gs. ${item.price.toLocaleString("es-PY")}`, sub: `≈ USD ${usd.toLocaleString("en-US")}` };
}

function typeLabel(t) {
  return ({ casa: "Casa", depto: "Depto", lote: "Lote", quinta: "Quinta" }[t] || t);
}

function cardHTML(item) {
  const p = fmtPrice(item);
  const period = item.period ? ` / ${item.period}` : "";
  const specs = [];
  if (item.beds) specs.push(`${item.beds} dorm`);
  if (item.baths) specs.push(`${item.baths} baños`);
  if (item.built) specs.push(`${item.built} m² const.`);
  if (item.land) specs.push(`${item.land} m² terr.`);
  return `
    <a class="card" href="#/aviso/${item.id}">
      <div class="photo" style="background-image:url('${item.img}')">
        <span class="badge ${item.op}">${item.op === "sale" ? "Venta" : "Alquiler"} · ${typeLabel(item.type)}</span>
      </div>
      <div class="body">
        <div class="price">${p.main}${period} <small>${p.sub}</small></div>
        <div style="margin-top:6px;font-weight:600">${item.title}</div>
        <div class="meta">${item.barrio}, ${item.city} · ${item.who}${item.agent ? " · " + item.agent : ""}${item.plan ? " · " + item.plan : ""}</div>
        <div class="specs">${specs.map(s => `<span>${s}</span>`).join("")}</div>
      </div>
    </a>`;
}

function mine() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem("ny_mine") || "[]"); } catch { local = []; }
  const map = new Map();
  [...(REMOTE.listings || []), ...local].forEach((x) => map.set(x.id, x));
  return [...map.values()];
}
function savedIds() {
  try { return JSON.parse(localStorage.getItem("ny_saved") || "[]"); } catch { return []; }
}
function allListings() { return [...mine(), ...LISTINGS]; }

function office() {
  if (HAS_API && REMOTE.office && (REMOTE.office.name || (REMOTE.office.agents || []).length)) return REMOTE.office;
  try {
    return JSON.parse(localStorage.getItem("ny_office") || "null") || { name: "", city: "", agents: [] };
  } catch { return { name: "", city: "", agents: [] }; }
}
function saveOffice(o) {
  localStorage.setItem("ny_office", JSON.stringify(o));
  REMOTE.office = o;
  api("/api/office", o);
}
function addAgent() {
  const name = $("#a-name")?.value.trim();
  const wa = ($("#a-wa")?.value || "").replace(/\D/g, "");
  if (!name || !wa) return alert("Nombre y WhatsApp del agente.");
  const o = office();
  o.agents.push({ id: "ag-" + Date.now(), name, wa });
  saveOffice(o);
  location.hash = "#/oficina";
  render();
}
function removeAgent(id) {
  const o = office();
  o.agents = o.agents.filter(a => a.id !== id);
  saveOffice(o);
  render();
}
function saveOfficeForm() {
  const o = office();
  o.name = $("#o-name").value.trim();
  o.city = $("#o-city").value.trim();
  if (!o.name) return alert("Nombre de la inmobiliaria.");
  saveOffice(o);
  alert("Oficina guardada en este navegador.");
  render();
}

function users() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem("ny_users") || "[]"); } catch { local = []; }
  const map = new Map();
  [...(REMOTE.users || []), ...local].forEach((x) => map.set(x.phone, x));
  return [...map.values()];
}
function session() {
  try { return JSON.parse(localStorage.getItem("ny_session") || "null"); } catch { return null; }
}
function setSession(u) {
  if (u) localStorage.setItem("ny_session", JSON.stringify(u));
  else localStorage.removeItem("ny_session");
}
function leads() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem("ny_leads") || "[]"); } catch { local = []; }
  const map = new Map();
  [...(REMOTE.leads || []), ...local].forEach((x) => map.set(x.id, x));
  return [...map.values()];
}
function registerUser() {
  const name = $("#r-name").value.trim();
  const phone = ($("#r-phone").value || "").replace(/\D/g, "");
  const pin = $("#r-pin").value;
  const role = $("#r-role").value;
  if (!name || phone.length < 8 || pin.length < 4) return alert("Nombre, teléfono y PIN de 4 dígitos.");
  const list = users();
  if (list.some(u => u.phone === phone)) return alert("Ese teléfono ya está registrado en este navegador.");
  const u = { name, phone, pin, role };
  list.push(u);
  localStorage.setItem("ny_users", JSON.stringify(list));
  REMOTE.users = list;
  api("/api/users", u);
  setSession({ name, phone, role });
  location.hash = role === "agency" || role === "agent" ? "#/oficina" : "#/publicar";
  render();
}
function loginUser() {
  const phone = ($("#l-phone").value || "").replace(/\D/g, "");
  const pin = $("#l-pin").value;
  const u = users().find(x => x.phone === phone && x.pin === pin);
  if (!u) return alert("Teléfono o PIN incorrecto.");
  setSession({ name: u.name, phone: u.phone, role: u.role });
  location.hash = "#/";
  render();
}
function saveApiUrl() {
  const v = ($("#api-url")?.value || "").trim().replace(/\/$/, "");
  if (v) localStorage.setItem("ny_api", v);
  else localStorage.removeItem("ny_api");
  location.reload();
}
function logoutUser() {
  setSession(null);
  location.hash = "#/cuenta";
  render();
}
function addLead(listingId) {
  const item = allListings().find(l => l.id === listingId);
  if (!item) return;
  const row = {
    id: "ld-" + Date.now(),
    listingId,
    title: item.title,
    to: item.agent || item.who,
    wa: item.wa,
    at: new Date().toLocaleString("es-PY")
  };
  const all = [row, ...leads()];
  localStorage.setItem("ny_leads", JSON.stringify(all));
  REMOTE.leads = all;
  api("/api/leads", row);
  alert("Consulta anotada en Leads. También podés seguir por WhatsApp.");
  location.hash = "#/leads";
  render();
}
function refreshNav() {
  const el = document.getElementById("nav-user");
  if (!el) return;
  const s = session();
  el.textContent = s ? s.name.split(" ")[0] : "Entrar";
}

function home() {
  const featured = allListings().filter(l => l.featured || l.mine);
  return `
    <section class="hero"><div class="wrap">
      <h1>Ñande yvy, en todo el Paraguay.</h1>
      <p>Dueño USD 12 el aviso · inmobiliaria USD 49 al mes · si vendemos nosotros, 5%. Buscar es gratis.</p>
      <form class="searchbox" onsubmit="event.preventDefault(); goSearch();">
        <select id="q-op"><option value="">Venta y alquiler</option><option value="sale">Venta</option><option value="rent">Alquiler</option></select>
        <select id="q-type"><option value="">Todo tipo</option><option value="casa">Casa</option><option value="depto">Departamento</option><option value="lote">Lote / terreno</option><option value="quinta">Quinta / campo</option></select>
        <select id="q-city"><option value="">Todo el país</option>
          <option>Asunción</option><option>Luque</option><option>San Lorenzo</option><option>Lambaré</option><option>Capiatá</option><option>Fernando de la Mora</option>
          <option>Ciudad del Este</option><option>Presidente Franco</option><option>Encarnación</option><option>Altos</option>
          <option>Caaguazú</option><option>Coronel Oviedo</option><option>Pedro Juan Caballero</option><option>Concepción</option><option>Villarrica</option><option>Pilar</option>
        </select>
        <button class="btn btn-dark" type="submit">Buscar</button>
      </form>
      <div class="chips">
        <button class="chip" onclick="quick('sale','lote')">Lotes</button>
        <button class="chip" onclick="quick('rent','')">Alquileres</button>
        <button class="chip" onclick="quick('sale','casa')">Casas en venta</button>
        <button class="chip" onclick="quick('','','Asunción')">Asunción</button>
        <button class="chip" onclick="quick('','','Ciudad del Este')">CDE</button>
      </div>
    </div></section>
    <section class="section"><div class="wrap">
      <h2>Destacados</h2>
      <div class="grid">${featured.map(cardHTML).join("")}</div>
    </div></section>
    <section class="section"><div class="wrap">
      <h2>Cobertura nacional</h2>
      <div class="cities">
        ${[
          ["Asunción", "Villa Morra, Carmelitas, Centro"],
          ["Central", "Luque, Lambaré, San Lorenzo"],
          ["Alto Paraná", "Ciudad del Este y alrededores"],
          ["Itapúa", "Encarnación y costanera"],
          ["Cordillera", "San Bernardino, Altos, Caacupé"],
          ["Resto del país", "Loteamientos, chácaras, campos"]
        ].map(([n,s]) => `<a class="city" href="#/buscar?city=${encodeURIComponent(n.split(" ")[0] === "Resto" ? "" : n)}"><strong>${n}</strong><span>${s}</span></a>`).join("")}
      </div>
    </div></section>`;
}

function parseQuery() {
  const q = new URLSearchParams((location.hash.split("?")[1] || ""));
  return { op: q.get("op") || "", type: q.get("type") || "", city: q.get("city") || "" };
}

function searchView() {
  const f = parseQuery();
  const rows = allListings().filter(l =>
    (!f.op || l.op === f.op) &&
    (!f.type || l.type === f.type) &&
    (!f.city || l.city === f.city || l.dept === f.city)
  );
  return `
    <div class="wrap layout">
      <aside class="filters">
        <h3>Filtros</h3>
        <label>Operación
          <select id="f-op" onchange="applyFilters()">
            <option value="">Todas</option>
            <option value="sale" ${f.op==="sale"?"selected":""}>Venta</option>
            <option value="rent" ${f.op==="rent"?"selected":""}>Alquiler</option>
          </select>
        </label>
        <label>Tipo
          <select id="f-type" onchange="applyFilters()">
            <option value="">Todos</option>
            <option value="casa" ${f.type==="casa"?"selected":""}>Casa</option>
            <option value="depto" ${f.type==="depto"?"selected":""}>Depto</option>
            <option value="lote" ${f.type==="lote"?"selected":""}>Lote</option>
            <option value="quinta" ${f.type==="quinta"?"selected":""}>Quinta</option>
          </select>
        </label>
        <label>Ciudad
          <select id="f-city" onchange="applyFilters()">
            <option value="">Todo Paraguay</option>
            ${["Asunción","Luque","San Lorenzo","Lambaré","Ciudad del Este","Encarnación","Altos","Caaguazú"].map(c =>
              `<option ${f.city===c?"selected":""}>${c}</option>`).join("")}
          </select>
        </label>
        <p class="meta" style="margin-top:12px">Prototipo: filtros reales de precio y m² entran en el backend.</p>
      </aside>
      <div>
        <div class="results-head">
          <h2>${rows.length} avisos</h2>
          <span class="meta">${f.op==="rent"?"Alquiler":f.op==="sale"?"Venta":"Venta y alquiler"} · nacional</span>
        </div>
        <div class="grid">${rows.map(cardHTML).join("") || "<p>No hay avisos con esos filtros.</p>"}</div>
      </div>
    </div>`;
}

function detail(id) {
  const item = allListings().find(l => l.id === id);
  if (!item) return `<div class="wrap"><p>Aviso no encontrado.</p></div>`;
  const p = fmtPrice(item);
  const period = item.period ? ` / ${item.period}` : "";
  const msg = encodeURIComponent(`Hola, vi el aviso ${item.id} (${item.title}) en Ñande Yvy y quiero más datos.`);
  return `
    <div class="wrap detail">
      <div>
        <div class="gallery" style="background-image:url('${item.img}')"></div>
        <p class="kicker" style="margin-top:18px">${item.op === "sale" ? "Venta" : "Alquiler"} · ${typeLabel(item.type)} · ${item.id}</p>
        <h1 style="font-family:'Source Serif 4',serif;font-size:36px;margin:6px 0 10px">${item.title}</h1>
        <p class="meta">${item.barrio}, ${item.city} · ${item.dept}</p>
        <p style="margin:16px 0;line-height:1.6;color:var(--ink-soft)">${item.desc}</p>
        <div class="specs">
          ${item.beds ? `<span>${item.beds} dormitorios</span>` : ""}
          ${item.baths ? `<span>${item.baths} baños</span>` : ""}
          ${item.built ? `<span>${item.built} m² construidos</span>` : ""}
          ${item.land ? `<span>${item.land} m² terreno</span>` : ""}
        </div>
        <div class="notice">Ñande Yvy no certifica título. Pedí a tu escribano: escritura, libertad de gravamen, certificado catastral/RUN e impuesto municipal al día.</div>
      </div>
      <aside class="side">
        <div class="price">${p.main}${period}</div>
        <div class="meta">${p.sub} · tipo de cambio prototipo Gs. ${FX}</div>
        <p style="margin:12px 0 4px"><strong>${item.who}</strong>${item.agent ? " · " + item.agent : ""} · ${item.legal}</p>
        ${item.mode === "broker" ? `<div class="notice">Exclusiva Ñande Yvy: nosotros visitamos, negociamos y cobramos comisión al cierre (5% venta / 1 mes de alquiler).</div>` : ""}
        <a class="btn btn-wa" style="display:block;text-align:center;margin-top:14px"
           href="https://wa.me/${item.wa}?text=${msg}" target="_blank" rel="noopener">${item.who === "Ñande Yvy" ? "WhatsApp Ñande Yvy" : item.agent ? "WhatsApp " + item.agent : "WhatsApp al dueño"}</a>
        <button class="btn btn-line" style="width:100%;margin-top:8px" onclick="addLead('${item.id}')">Dejar consulta (lead)</button>
        <button class="btn btn-line" style="width:100%;margin-top:8px" onclick="toggleSave('${item.id}')">${savedIds().includes(item.id) ? "Guardado" : "Guardar aviso"}</button>
      </aside>
    </div>`;
}

function publish() {
  return `
    <form class="wizard" onsubmit="event.preventDefault(); saveListing();">
      <h2>Publicar</h2>
      <p class="meta" style="margin-bottom:16px"><a href="#/planes">Ver planes</a>. El 5% solo si Ñande Yvy cierra.</p>
      <div class="plans">
        <label class="plan"><input type="radio" name="p-who" value="owner" checked>
          <strong>Dueño · USD 12 / 30 días</strong>
          <span>Tu WhatsApp. Sin comisión.</span></label>
        <label class="plan"><input type="radio" name="p-who" value="agency">
          <strong>Inmobiliaria · USD 49 / mes</strong>
          <span>Hasta 30 avisos y 8 agentes. Sin comisión en tus ventas.</span></label>
        <label class="plan"><input type="radio" name="p-who" value="broker">
          <strong>Que venda Ñande Yvy · 5%</strong>
          <span>Nosotros hablamos con el comprador. 5% al firmar la escritura.</span></label>
      </div>
      <div class="field" id="agency-name-wrap" style="display:none">
        <label>Inmobiliaria</label>
        <input id="p-office" placeholder="Inmobiliaria López" value="${office().name || ""}">
        <label style="margin-top:10px">Agente que atiende</label>
        <select id="p-agent">
          <option value="">Elegí agente (cargalos en Oficina)</option>
          ${office().agents.map(a => `<option value="${a.id}">${a.name} · ${a.wa}</option>`).join("")}
        </select>
        <p class="meta"><a href="#/oficina">Cargar agentes en Oficina</a></p>
      </div>
      <div class="row2">
        <div class="field"><label>Operación</label>
          <select id="p-op"><option value="sale">Venta</option><option value="rent">Alquiler</option></select></div>
        <div class="field"><label>Tipo</label>
          <select id="p-type"><option value="casa">Casa</option><option value="depto">Departamento</option><option value="lote">Lote / terreno</option><option value="quinta">Quinta</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Ciudad</label>
          <select id="p-city"><option>Asunción</option><option>Luque</option><option>Lambaré</option><option>San Lorenzo</option><option>Capiatá</option><option>Fernando de la Mora</option><option>Ciudad del Este</option><option>Presidente Franco</option><option>Encarnación</option><option>Altos</option><option>Caaguazú</option><option>Coronel Oviedo</option><option>Pedro Juan Caballero</option><option>Concepción</option><option>Villarrica</option><option>Pilar</option></select></div>
        <div class="field"><label>Barrio</label><input id="p-barrio" placeholder="Villa Morra" required></div>
      </div>
      <div class="row2">
        <div class="field"><label>Precio</label><input id="p-price" type="number" min="1" required placeholder="185000" oninput="showFx()"></div>
        <div class="field"><label>Moneda</label><select id="p-cur" onchange="showFx()"><option value="USD">USD</option><option value="PYG">Gs. (PYG)</option></select></div>
      </div>
      <p class="meta" id="fx-hint">El aviso muestra USD y guaraníes (ref. Gs. 7.300 = USD 1).</p>
      <div class="row2" style="display:none">
      </div>
      <div class="row2">
        <div class="field"><label>m² terreno</label><input id="p-land" type="number" value="0"></div>
        <div class="field"><label>m² construido</label><input id="p-built" type="number" value="0"></div>
      </div>
      <div class="field"><label>Título</label><input id="p-title" required placeholder="Casa 3 dorm. en Luque"></div>
      <div class="field"><label>WhatsApp</label><input id="p-wa" required placeholder="595981123456"></div>
      <div class="field"><label>Foto de la fachada</label>
        <input id="p-photo" type="file" accept="image/*"></div>
      <div class="field"><label>Descripción</label><textarea id="p-desc" rows="4" required></textarea></div>
      <button class="btn btn-dark" type="submit">Publicar</button>
      <button class="btn btn-gold" type="button" onclick="startPay((document.querySelector('input[name=p-who]:checked')||{}).value==='agency'?'oficina49':'usd12')">Pagar Bancard (USD y Gs.)</button>
    </form>`;
}

function officeView() {
  const o = office();
  return `<div class="wizard">
    <h2>Oficina</h2>
    <p class="meta" style="margin-bottom:14px">Plan Oficina USD 49 / mes. Si abrís el sitio con node server.js, la oficina se comparte.</p>
    <div class="field"><label>Nombre de la inmobiliaria</label>
      <input id="o-name" value="${o.name || ""}" placeholder="Inmobiliaria López"></div>
    <div class="field"><label>Ciudad base</label>
      <input id="o-city" value="${o.city || ""}" placeholder="Encarnación"></div>
    <button class="btn btn-dark" type="button" onclick="saveOfficeForm()">Guardar oficina</button>
    <h2 style="margin-top:28px">Agentes</h2>
    <p class="meta">${o.agents.length} de 8</p>
    <div style="margin:12px 0">${o.agents.map(a => `
      <div class="plan" style="margin-bottom:8px">
        <strong>${a.name}</strong>
        <span>${a.wa} · <a href="#" onclick="event.preventDefault();removeAgent('${a.id}')">Quitar</a></span>
      </div>`).join("") || "<p class='meta'>Todavía no hay agentes.</p>"}</div>
    <div class="row2">
      <div class="field"><label>Nombre del agente</label><input id="a-name" placeholder="Ana Benítez"></div>
      <div class="field"><label>WhatsApp</label><input id="a-wa" placeholder="595981123456"></div>
    </div>
    <button class="btn btn-gold" type="button" onclick="addAgent()">Agregar agente</button>
    <p class="meta" style="margin-top:16px"><a href="#/publicar">Publicar aviso con un agente</a></p>
  </div>`;
}

function myAds() {
  const rows = mine();
  return `<div class="wrap" style="padding:24px 0 80px">
    <h2>Mis avisos</h2>
    <p class="meta" style="margin:8px 0 16px">${rows.length} publicados en este teléfono</p>
    <div class="grid">${rows.map(cardHTML).join("") || "<p>Todavía no publicaste. <a href='#/publicar'>Cargar el primero</a>.</p>"}</div>
  </div>`;
}

function savedView() {
  const rows = allListings().filter(l => savedIds().includes(l.id));
  return `<div class="wrap" style="padding:24px 0 80px">
    <h2>Guardados</h2>
    <div class="grid">${rows.map(cardHTML).join("") || "<p>Todavía no guardaste avisos.</p>"}</div>
  </div>`;
}

function planes() {
  return `<div class="wrap" style="padding:24px 0 80px;max-width:720px">
    <h2>Planes</h2>
    <p class="meta" style="margin:8px 0 18px">Buscar y guardar avisos es gratis siempre.</p>
    <div class="plans">
      <div class="plan"><strong>Dueño</strong><span>USD 12 · 30 días · 1 aviso · tu WhatsApp · 0% comisión</span></div>
      <div class="plan"><strong>Oficina Starter</strong><span>USD 29 / mes · 12 avisos · 3 agentes · 0% sobre tus cierres</span></div>
      <div class="plan"><strong>Oficina</strong><span>USD 49 / mes · 30 avisos · 8 agentes · aviso extra USD 4</span></div>
      <div class="plan"><strong>Ñande Yvy vende</strong><span>5% al cierre (venta) o 1 mes de alquiler · nosotros atendemos</span></div>
    </div>
    <p class="meta">Oficina nueva: 5 avisos gratis por 30 días para cargar inventario. Después entra el plan.</p>
    <p class="meta">Co-broke opcional (50/50 del 5%) solo si ellos quieren tu comprador.</p>
    <a class="btn btn-dark" href="#/publicar">Cargar un aviso</a>
    <p class="meta" style="margin-top:16px"><a href="/api/state" target="_blank">Descargar copia de avisos (JSON)</a></p>
  </div>`;
}

function account() {
  const s = session();
  if (s) {
    return `<div class="wizard">
      <h2>${s.name}</h2>
      <p class="meta">${s.role === "owner" ? "Dueño" : s.role === "agent" ? "Agente" : "Inmobiliaria"} · ${s.phone}</p>
      <p style="margin:14px 0"><a href="#/publicar">Publicar</a> · <a href="#/oficina">Oficina</a> · <a href="#/leads">Leads</a> · <a href="#/mis">Mis avisos</a></p>
      <button class="btn btn-line" type="button" onclick="logoutUser()">Salir</button>
      <div class="field" style="margin-top:22px"><label>URL del servidor (Paraguay / USA)</label>
        <input id="api-url" placeholder="https://nandeyvy-xxxx.onrender.com" value="${localStorage.getItem("ny_api") || ""}">
      </div>
      <button class="btn btn-dark" type="button" onclick="saveApiUrl()">Guardar servidor</button>
    </div>`;
  }
  return `<div class="wizard">
    <h2>Entrar</h2>
    <p class="meta">Si estás en otro país, pegá acá la URL pública del servidor.</p>
    <div class="field"><label>URL del servidor</label>
      <input id="api-url" placeholder="https://nandeyvy-xxxx.onrender.com" value="${localStorage.getItem("ny_api") || ""}"></div>
    <button class="btn btn-line" type="button" onclick="saveApiUrl()">Guardar servidor</button>
    <p class="meta">PIN en este navegador. En producción: OTP por SMS.</p>
    <div class="field"><label>Teléfono</label><input id="l-phone" placeholder="595981123456"></div>
    <div class="field"><label>PIN</label><input id="l-pin" type="password" maxlength="6"></div>
    <button class="btn btn-dark" type="button" onclick="loginUser()">Entrar</button>
    <h2 style="margin-top:28px">Crear cuenta</h2>
    <div class="field"><label>Nombre</label><input id="r-name" placeholder="Ana Benítez"></div>
    <div class="field"><label>Teléfono</label><input id="r-phone" placeholder="595981123456"></div>
    <div class="field"><label>PIN (4 dígitos)</label><input id="r-pin" maxlength="6"></div>
    <div class="field"><label>Rol</label>
      <select id="r-role">
        <option value="owner">Dueño</option>
        <option value="agency">Dueño de inmobiliaria</option>
        <option value="agent">Agente</option>
      </select>
    </div>
    <button class="btn btn-gold" type="button" onclick="registerUser()">Crear y entrar</button>
  </div>`;
}

function leadsView() {
  const rows = leads();
  return `<div class="wrap" style="padding:24px 0 80px;max-width:720px">
    <h2>Leads</h2>
    <p class="meta">Consultas hechas desde la ficha (este navegador).</p>
    ${rows.map(l => `<div class="plan" style="margin:10px 0"><strong>${l.title}</strong><span>Para ${l.to} · ${l.at} · <a href="https://wa.me/${l.wa}" target="_blank">WhatsApp</a></span></div>`).join("") || "<p class='meta'>Todavía no hay consultas.</p>"}
  </div>`;
}

function showFx() {
  const n = Number($("#p-price")?.value || 0);
  const c = $("#p-cur")?.value || "USD";
  const el = $("#fx-hint");
  if (!el || !n) return;
  if (c === "USD") el.textContent = "USD " + n.toLocaleString("en-US") + "  ·  ≈ Gs. " + Math.round(n * FX).toLocaleString("es-PY");
  else el.textContent = "Gs. " + n.toLocaleString("es-PY") + "  ·  ≈ USD " + Math.round(n / FX).toLocaleString("en-US");
}

async function startPay(plan) {
  const r = await api("/api/pay", { plan: plan || "usd12" });
  if (!r) { alert("No se pudo iniciar el pago."); return; }
  sessionStorage.setItem("ny_pay", JSON.stringify(r));
  location.hash = "#/pagar";
}

function payView() {
  let info = {};
  try { info = JSON.parse(sessionStorage.getItem("ny_pay") || "{}"); } catch {}
  return `<div class="wizard">
    <h2>Pagar aviso</h2>
    <p>USD ${info.usd || 12}  ·  Gs. ${Number(info.pyg || 87600).toLocaleString("es-PY")}</p>
    <p class="meta">${info.demo ? "Bancard no habilitado todavía. Pago simulado." : "Bancard vPOS"}</p>
    <div style="min-height:80px;margin:16px 0">${info.demo ? "Cuando Bancard te dé las claves, el iframe de tarjeta sale acá." : "Checkout Bancard iniciado."}</div>
    <button class="btn btn-dark" type="button" onclick="location.hash='#/publicar'">Continuar</button>
    <p class="meta" style="margin-top:18px">Dominio: NIC Paraguay → nandeyvy.com.py → Render Custom Domain.</p>
  </div>`;
}

function saveListing() {
  const finish = (img) => {
  const item = {
    id: "MIO-" + Date.now().toString().slice(-6),
    op: $("#p-op").value, type: $("#p-type").value,
    title: $("#p-title").value,
    city: $("#p-city").value, barrio: $("#p-barrio").value, dept: $("#p-city").value,
    price: Number($("#p-price").value), currency: $("#p-cur").value,
    land: Number($("#p-land").value) || 0, built: Number($("#p-built").value) || 0,
    beds: 0, baths: 0, parking: 0, legal: "Boleto",
    role: document.querySelector("input[name=p-who]:checked").value,
    plan: ({ owner: "usd12", agency: "oficina49", broker: "exclusiva5" })[document.querySelector("input[name=p-who]:checked").value],
    who: document.querySelector("input[name=p-who]:checked").value === "broker" ? "Ñande Yvy"
      : (document.querySelector("input[name=p-who]:checked").value === "agency" ? ($("#p-office").value || office().name || "Inmobiliaria") : "Dueño"),
    agent: (function(){
      const role = document.querySelector("input[name=p-who]:checked").value;
      if (role !== "agency") return "";
      const ag = office().agents.find(a => a.id === $("#p-agent")?.value);
      return ag ? ag.name : "";
    })(),
    featured: document.querySelector("input[name=p-who]:checked").value === "broker",
    mine: true, img: img || "img/q2.jpg",
    desc: $("#p-desc").value,
    wa: (function(){
      const role = document.querySelector("input[name=p-who]:checked").value;
      if (role === "broker") return "595981000000";
      if (role === "agency") {
        const ag = office().agents.find(a => a.id === $("#p-agent")?.value);
        return ag ? ag.wa : ($("#p-wa").value.replace(/\D/g, ""));
      }
      return $("#p-wa").value.replace(/\D/g, "");
    })()
  };
  const next = [item, ...mine().filter((x) => x.id !== item.id)];
  localStorage.setItem("ny_mine", JSON.stringify(next));
  REMOTE.listings = next;
  api("/api/listings", item);
  location.hash = "#/aviso/" + item.id;
  };
  const file = $("#p-photo") && $("#p-photo").files && $("#p-photo").files[0];
  if (!file) return finish("img/q2.jpg");
  const reader = new FileReader();
  reader.onload = async () => {
    const up = await api("/api/photo", { dataUrl: reader.result });
    finish((up && up.url) || reader.result);
  };
  reader.readAsDataURL(file);
}

function toggleSave(id) {
  const s = new Set(savedIds());
  if (s.has(id)) s.delete(id); else s.add(id);
  localStorage.setItem("ny_saved", JSON.stringify([...s]));
  render();
}

function goSearch() {
  const op = $("#q-op")?.value || "";
  const type = $("#q-type")?.value || "";
  const city = $("#q-city")?.value || "";
  location.hash = `#/buscar?op=${op}&type=${type}&city=${encodeURIComponent(city)}`;
}
function quick(op, type, city = "") {
  location.hash = `#/buscar?op=${op}&type=${type}&city=${encodeURIComponent(city)}`;
}
function applyFilters() {
  const op = $("#f-op").value, type = $("#f-type").value, city = $("#f-city").value;
  location.hash = `#/buscar?op=${op}&type=${type}&city=${encodeURIComponent(city)}`;
}

function render() {
  const hash = location.hash || "#/";
  const [path, ] = hash.slice(1).split("?");
  const parts = path.split("/").filter(Boolean);
  let html = "";
  if (parts[0] === "buscar") html = searchView();
  else if (parts[0] === "aviso") html = detail(parts[1]);
  else if (parts[0] === "publicar") html = publish();
  else if (parts[0] === "mis") html = myAds();
  else if (parts[0] === "guardados") html = savedView();
  else if (parts[0] === "cuenta") html = account();
  else if (parts[0] === "planes") html = planes();
  else if (parts[0] === "oficina") html = officeView();
  else if (parts[0] === "leads") html = leadsView();
  else if (parts[0] === "pagar") html = payView();
  else html = home();
  $("#app").innerHTML = html;
  document.querySelectorAll("input[name=p-who]").forEach((r) => {
    r.addEventListener("change", () => {
      const w = document.getElementById("agency-name-wrap");
      if (w) w.style.display = document.querySelector("input[name=p-who]:checked").value === "agency" ? "block" : "none";
    });
  });
  refreshNav();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", boot);
