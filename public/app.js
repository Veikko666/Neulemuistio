import { db } from './db.js';

// ---------- Vakiot ----------
const STATUSES = {
  suunnitteilla: 'Suunnitteilla',
  kesken: 'Kesken',
  tauolla: 'Tauolla',
  valmis: 'Valmis',
};
const TOOL_TYPES = {
  puikot: 'Neulepuikot',
  pyoropuikot: 'Pyöröpuikot',
  sukkapuikot: 'Sukkapuikot',
  koukku: 'Virkkuukoukku',
  merkit: 'Silmukkamerkit',
  muu: 'Muu väline',
};
const NEED_UNITS = { m: 'metriä', g: 'grammaa', k: 'kerää' };
// Välinetyypit, joita voi tallentaa omiin välineisiin
const INV_TYPES = ['puikot', 'sukkapuikot', 'pyoropuikot', 'koukku'];
const INV_LABELS = { puikot: 'Neulepuikot', sukkapuikot: 'Sukkapuikot', pyoropuikot: 'Pyöröpuikot', koukku: 'Virkkuukoukut' };

// ---------- Tila ----------
const app = document.getElementById('app');
const state = { filter: 'kaikki', search: '', projects: [], inv: [], allProjects: [] };
let cur = null; // avoinna oleva työ
let saveTimer = null;

// ---------- Apufunktiot ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
};
const fmt = (n, d = 0) => n.toLocaleString('fi-FI', { maximumFractionDigits: d });
const opts = (map, selected) =>
  Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');

function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+/.test(u)) return 'https://' + u;
  return '';
}

function newProject() {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: '',
    status: 'suunnitteilla',
    created: now,
    updated: now,
    startDate: '',
    endDate: '',
    size: '',
    gauge: '',
    photos: [],
    pattern: { name: '', designer: '', url: '', files: [] },
    yarns: [],
    tools: [],
    notes: [],
  };
}

function normalize(p) {
  const base = newProject();
  return { ...base, ...p, pattern: { ...base.pattern, ...(p.pattern || {}) } };
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2500);
}

// ---------- Tiedostot ----------
const urlCache = new Map();
async function fileURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const f = await db.get('files', id);
  if (!f) return null;
  const u = URL.createObjectURL(f.blob);
  urlCache.set(id, u);
  return u;
}
async function removeFile(id) {
  await db.del('files', id);
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id));
    urlCache.delete(id);
  }
}

function hydrate(root) {
  root.querySelectorAll('img[data-file]').forEach(async (img) => {
    const u = await fileURL(img.dataset.file);
    if (u) img.src = u;
  });
  root.querySelectorAll('a[data-file-href]').forEach(async (a) => {
    const u = await fileURL(a.dataset.fileHref);
    if (u) a.href = u;
  });
}

// Pienennetään isot kuvat, ettei laitteen tila lopu kesken.
async function prepareImage(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

async function storeFiles(fileList) {
  const out = [];
  for (const file of fileList) {
    const blob = file.type.startsWith('image/') ? await prepareImage(file) : file;
    const id = uid();
    const type = blob.type || file.type || 'application/octet-stream';
    await db.put('files', { id, blob, name: file.name, type });
    out.push({ id, name: file.name, type });
  }
  return out;
}

// ---------- Omat välineet ----------
const withUnit = (v, unit) => {
  const s = String(v ?? '').trim();
  return /^\d+([.,]\d+)?$/.test(s) ? `${s} ${unit}` : s;
};
function invLabel(it) {
  return [withUnit(it.size, 'mm'), withUnit(it.length, 'cm'), it.material].filter(Boolean).join(', ') || 'koko puuttuu';
}
async function loadInv() {
  state.inv = await db.all('tools');
}
// Kaikki työt, avoinna olevasta käytetään muokattua versiota
function projectsNow() {
  return state.allProjects.map((p) => (cur && p.id === cur.id ? cur : p));
}
function projectsUsing(invId) {
  return projectsNow().filter((p) => p.tools.some((t) => t.inventoryId === invId));
}
const sameSize = (a, b) => num(a) !== null && num(a) === num(b);

const invTimers = new Map();
function saveInv(it, now = false) {
  clearTimeout(invTimers.get(it.id));
  if (now) {
    invTimers.delete(it.id);
    return db.put('tools', it);
  }
  invTimers.set(it.id, setTimeout(() => {
    invTimers.delete(it.id);
    db.put('tools', it);
  }, 400));
}
function flushInv() {
  const pending = [...invTimers.keys()];
  return Promise.all(pending.map((id) => {
    const it = state.inv.find((i) => i.id === id);
    return it ? saveInv(it, true) : null;
  }));
}

// ---------- Tallennus ----------
async function persist(p) {
  p.updated = new Date().toISOString();
  await db.put('projects', p);
  const s = document.getElementById('saved');
  if (s && p === cur) {
    s.textContent = 'Tallennettu ✓';
    clearTimeout(persist.timer);
    persist.timer = setTimeout(() => (s.textContent = ''), 1500);
  }
}
function save(now = false) {
  if (!cur) return;
  clearTimeout(saveTimer);
  const p = cur;
  if (now) {
    saveTimer = null;
    return persist(p);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persist(p);
  }, 400);
}
function flush() {
  return Promise.all([saveTimer && cur ? save(true) : null, flushInv()]);
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
window.addEventListener('pagehide', flush);

// ---------- Lankalaskuri ----------
function yarnCalc(y) {
  const mps = num(y.metersPerSkein);
  const gps = num(y.gramsPerSkein);
  const need = num(y.needAmount);
  const owned = num(y.skeinsOwned);
  if (need === null) return null;
  let skeins = null, meters = null, grams = null;
  const unit = y.needUnit || 'm';
  if (unit === 'k') {
    skeins = need;
    if (mps) meters = need * mps;
    if (gps) grams = need * gps;
  } else if (unit === 'g') {
    grams = need;
    if (gps) skeins = need / gps;
    if (skeins !== null && mps) meters = skeins * mps;
  } else {
    meters = need;
    if (mps) skeins = need / mps;
    if (skeins !== null && gps) grams = skeins * gps;
  }
  const whole = skeins === null ? null : Math.ceil(skeins - 1e-9);
  return { skeins, whole, meters, grams, owned };
}

function yarnCalcHTML(y) {
  const c = yarnCalc(y);
  if (!c) return '<span class="muted">Syötä ohjeen mukainen tarve, niin lasken montako kerää tarvitset.</span>';
  if (c.whole === null) {
    const missing = (y.needUnit || 'm') === 'g' ? 'grammat / kerä' : 'metrit / kerä';
    return `<span class="muted">Lisää langan ${missing}, niin lasken kerien määrän.</span>`;
  }
  const extra = [];
  const unit = y.needUnit || 'm';
  if (c.meters !== null && unit !== 'm') extra.push(`≈ ${fmt(c.meters)} m`);
  if (c.grams !== null && unit !== 'g') extra.push(`≈ ${fmt(c.grams)} g`);
  let html = `Tarvitset <strong>${fmt(c.whole)} ${c.whole === 1 ? 'kerän' : 'kerää'}</strong>`;
  if (extra.length) html += ` <span class="muted">(${extra.join(', ')})</span>`;
  if (c.owned !== null) {
    const diff = c.owned - c.skeins;
    if (diff >= -1e-9) {
      html += `<br><span class="ok">✓ Lanka riittää</span>`;
      const spare = Math.floor(c.owned - c.whole + 1e-9);
      if (spare > 0) html += ` <span class="muted">– ylimääräistä ${fmt(spare)} ${spare === 1 ? 'kerä' : 'kerää'}</span>`;
    } else {
      const lack = Math.ceil(-diff - 1e-9);
      html += `<br><span class="warn">✗ Puuttuu ${fmt(lack)} ${lack === 1 ? 'kerä' : 'kerää'}</span>`;
    }
  }
  return html;
}

// ---------- Reititys ----------
async function route() {
  await flush();
  const m = location.hash.match(/^#\/p\/([\w-]+)/);
  if (m) await showProject(m[1]);
  else if (location.hash.startsWith('#/valineet')) await showInventory();
  else await showList();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ---------- Lista ----------
function searchText(p) {
  return [
    p.name, p.pattern.name, p.pattern.designer, p.size,
    ...p.yarns.flatMap((y) => [y.brand, y.name, y.color, y.fiber]),
    ...p.notes.map((n) => n.text),
  ].join(' ').toLowerCase();
}

async function showList() {
  cur = null;
  document.title = 'Neulemuistio';
  state.projects = (await db.all('projects')).map(normalize).sort((a, b) => b.updated.localeCompare(a.updated));
  const chips = ['kaikki', ...Object.keys(STATUSES)]
    .map((s) => `<button class="chip ${state.filter === s ? 'on' : ''}" data-action="filter" data-status="${s}">${s === 'kaikki' ? 'Kaikki' : STATUSES[s]}</button>`)
    .join('');
  app.innerHTML = `
    <header class="topbar">
      <h1><img src="icon.svg" alt="" class="logo"> Neulemuistio</h1>
      <button class="btn primary" data-action="new">+ Uusi työ</button>
    </header>
    ${navHTML('list')}
    ${state.projects.length ? `
    <div class="toolbar">
      <input type="search" id="search" placeholder="Hae nimellä, langalla, ohjeella…" value="${esc(state.search)}">
      <div class="chips">${chips}</div>
    </div>` : ''}
    <section id="grid" class="grid"></section>
    <footer class="footer">
      <p class="muted">Tiedot tallentuvat vain tälle laitteelle. Ota välillä varmuuskopio.</p>
      <div>
        <button class="btn ghost small" data-action="export">Vie varmuuskopio</button>
        <button class="btn ghost small" data-action="import">Tuo varmuuskopio</button>
      </div>
    </footer>`;
  renderGrid();
}

const navHTML = (active) => `
  <nav class="tabs">
    <a href="#/" class="${active === 'list' ? 'on' : ''}">🧶 Työt</a>
    <a href="#/valineet" class="${active === 'inv' ? 'on' : ''}">🪡 Omat välineet</a>
  </nav>`;

function renderGrid() {
  const grid = document.getElementById('grid');
  if (!state.projects.length) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🧶</div>
        <p>Ei vielä yhtään työtä.</p>
        <button class="btn primary" data-action="new">+ Aloita ensimmäinen työ</button>
      </div>`;
    return;
  }
  const q = state.search.trim().toLowerCase();
  const list = state.projects.filter(
    (p) => (state.filter === 'kaikki' || p.status === state.filter) && (!q || searchText(p).includes(q))
  );
  if (!list.length) {
    grid.innerHTML = '<p class="empty muted">Ei hakua vastaavia töitä.</p>';
    return;
  }
  grid.innerHTML = list.map(cardHTML).join('');
  hydrate(grid);
}

function cardHTML(p) {
  const cover = p.photos[0];
  const yarn = p.yarns.map((y) => [y.brand, y.name, y.color].filter(Boolean).join(' ')).filter(Boolean).join(' · ');
  const tools = p.tools.filter((t) => t.size).map((t) => t.size).join(', ');
  return `
    <a class="card" href="#/p/${p.id}">
      <div class="thumb">${cover ? `<img data-file="${cover}" alt="">` : '<span>🧶</span>'}</div>
      <div class="card-body">
        <h2>${esc(p.name || 'Nimetön työ')}</h2>
        <span class="badge s-${p.status}">${STATUSES[p.status] || ''}</span>
        ${yarn ? `<p class="meta">🧶 ${esc(yarn)}</p>` : ''}
        ${tools ? `<p class="meta">🪡 ${esc(tools)}</p>` : ''}
      </div>
    </a>`;
}

// ---------- Työn näkymä ----------
async function showProject(id) {
  const p = await db.get('projects', id);
  if (!p) {
    location.hash = '#/';
    return;
  }
  await loadInv();
  state.allProjects = (await db.all('projects')).map(normalize);
  cur = normalize(p);
  document.title = (cur.name || 'Nimetön työ') + ' – Neulemuistio';
  app.innerHTML = detailHTML(cur);
  hydrate(app);
  if (!cur.name) app.querySelector('[data-field="name"]').focus();
}

const field = (label, path, value, attrs = '') =>
  `<label class="field"><span>${label}</span><input data-field="${path}" value="${esc(value)}" ${attrs}></label>`;
const listField = (list, item, key, label, attrs = '') =>
  `<label class="field"><span>${label}</span><input data-list="${list}" data-id="${item.id}" data-key="${key}" value="${esc(item[key])}" ${attrs}></label>`;

function detailHTML(p) {
  const url = safeUrl(p.pattern.url);
  return `
    <header class="topbar">
      <button class="btn ghost" data-action="back">← Työt</button>
      <span class="saved" id="saved"></span>
      <button class="btn ghost danger" data-action="delete-project">Poista työ</button>
    </header>
    <div class="detail">
      <input class="title-input" data-field="name" value="${esc(p.name)}" placeholder="Työn nimi, esim. Isän villasukat" aria-label="Työn nimi">
      <div class="row">
        <label class="field"><span>Tila</span><select data-field="status">${opts(STATUSES, p.status)}</select></label>
        <label class="field"><span>Aloitettu</span><input type="date" data-field="startDate" value="${esc(p.startDate)}"></label>
        <label class="field"><span>Valmistui</span><input type="date" data-field="endDate" value="${esc(p.endDate)}"></label>
      </div>

      <section class="panel">
        <div class="panel-head"><h2>📷 Kuvat</h2><button class="btn small" data-action="add-photo">+ Lisää kuva</button></div>
        <div data-section="photos">${photosHTML(p)}</div>
      </section>

      <section class="panel">
        <h2>📖 Ohje</h2>
        <div class="row">
          ${field('Ohjeen nimi', 'pattern.name', p.pattern.name)}
          ${field('Suunnittelija / lähde', 'pattern.designer', p.pattern.designer)}
        </div>
        <label class="field"><span>Linkki ohjeeseen</span>
          <div class="inline">
            <input type="url" inputmode="url" data-field="pattern.url" value="${esc(p.pattern.url)}" placeholder="https://…">
            <a class="btn small" id="openUrl" target="_blank" rel="noopener noreferrer" ${url ? `href="${esc(url)}"` : 'aria-disabled="true"'}>Avaa ↗</a>
          </div>
        </label>
        <div class="row">
          ${field('Koko', 'size', p.size, 'placeholder="esim. 38–39 tai M"')}
          ${field('Neuletiheys', 'gauge', p.gauge, 'placeholder="esim. 22 s × 30 krs = 10 cm"')}
        </div>
        <div class="panel-head sub"><h3>Ohjeen kuvat ja PDF:t</h3><button class="btn small" data-action="add-pattern-file">+ Lisää tiedosto</button></div>
        <div data-section="patternFiles">${patternFilesHTML(p)}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>🧶 Langat</h2><button class="btn small" data-action="add-yarn">+ Lisää lanka</button></div>
        <div data-section="yarns">${yarnsHTML(p)}</div>
      </section>

      <section class="panel">
        <h2>🪡 Puikot, koukut ja merkit</h2>
        <div data-section="tools">${toolsHTML(p)}</div>
        <div data-section="toolPicker">${toolPickerHTML(p)}</div>
        <p class="muted small-text add-label">Tai merkitse tarvittava väline:</p>
        <div class="quick-add">
          <button class="btn small" data-action="add-tool" data-type="puikot">+ Neulepuikot</button>
          <button class="btn small" data-action="add-tool" data-type="pyoropuikot">+ Pyöröpuikot</button>
          <button class="btn small" data-action="add-tool" data-type="sukkapuikot">+ Sukkapuikot</button>
          <button class="btn small" data-action="add-tool" data-type="koukku">+ Koukku</button>
          <button class="btn small" data-action="add-tool" data-type="merkit">+ Merkit</button>
          <button class="btn small" data-action="add-tool" data-type="muu">+ Muu</button>
        </div>
      </section>

      <section class="panel">
        <h2>📝 Muistiinpanot</h2>
        <textarea id="noteText" rows="3" placeholder="Esim. ”Kantapää valmis, kavennukset joka 2. kerros”"></textarea>
        <div class="note-actions">
          <span class="muted small-text">Ctrl + Enter tallentaa</span>
          <button class="btn primary small" data-action="add-note">Tallenna muistiinpano</button>
        </div>
        <div data-section="notes">${notesHTML(p)}</div>
      </section>
    </div>`;
}

function photosHTML(p) {
  if (!p.photos.length) return '<button class="drop" data-action="add-photo">📷 Lisää kuva työstä</button>';
  return `<div class="gallery">${p.photos
    .map(
      (id, i) => `
      <figure class="ph">
        <img data-file="${id}" data-action="view" data-id="${id}" alt="Kuva työstä">
        ${i === 0 ? '<span class="cover-tag">Kansikuva</span>' : `<button class="ph-btn left" data-action="cover" data-id="${id}" title="Aseta kansikuvaksi" aria-label="Aseta kansikuvaksi">★</button>`}
        <button class="ph-btn" data-action="del-photo" data-id="${id}" title="Poista kuva" aria-label="Poista kuva">✕</button>
      </figure>`
    )
    .join('')}</div>`;
}

function patternFilesHTML(p) {
  if (!p.pattern.files.length) return '<p class="muted">Voit tallentaa ohjeen kuvana (esim. kuvakaappaus tai valokuva lehdestä) tai PDF:nä.</p>';
  return `<div class="gallery">${p.pattern.files
    .map((f) =>
      f.type.startsWith('image/')
        ? `<figure class="ph">
             <img data-file="${f.id}" data-action="view" data-id="${f.id}" alt="${esc(f.name)}">
             <button class="ph-btn" data-action="del-pattern-file" data-id="${f.id}" title="Poista" aria-label="Poista tiedosto">✕</button>
           </figure>`
        : `<figure class="ph doc">
             <a data-file-href="${f.id}" target="_blank" rel="noopener"><span class="doc-icon">📄</span><span class="doc-name">${esc(f.name)}</span></a>
             <button class="ph-btn" data-action="del-pattern-file" data-id="${f.id}" title="Poista" aria-label="Poista tiedosto">✕</button>
           </figure>`
    )
    .join('')}</div>`;
}

function yarnsHTML(p) {
  if (!p.yarns.length) return '<p class="muted">Ei lankoja vielä.</p>';
  return p.yarns
    .map(
      (y, i) => `
      <div class="item">
        <div class="item-head">
          <strong>Lanka ${i + 1}</strong>
          <button class="icon-btn" data-action="del-yarn" data-id="${y.id}" title="Poista lanka" aria-label="Poista lanka">✕</button>
        </div>
        <div class="row">
          ${listField('yarns', y, 'brand', 'Merkki', 'placeholder="esim. Novita"')}
          ${listField('yarns', y, 'name', 'Laatu', 'placeholder="esim. 7 Veljestä"')}
        </div>
        <div class="row">
          ${listField('yarns', y, 'color', 'Väri / sävynro')}
          ${listField('yarns', y, 'lot', 'Värjäyserä')}
          ${listField('yarns', y, 'fiber', 'Materiaali', 'placeholder="esim. 75 % villa"')}
        </div>
        <div class="row">
          ${listField('yarns', y, 'metersPerSkein', 'Metriä / kerä', 'inputmode="decimal" placeholder="esim. 200"')}
          ${listField('yarns', y, 'gramsPerSkein', 'Grammaa / kerä', 'inputmode="decimal" placeholder="esim. 100"')}
        </div>
        <div class="row">
          <label class="field"><span>Ohjeen mukainen tarve</span>
            <div class="inline">
              <input inputmode="decimal" data-list="yarns" data-id="${y.id}" data-key="needAmount" value="${esc(y.needAmount)}" placeholder="esim. 800">
              <select data-list="yarns" data-id="${y.id}" data-key="needUnit" aria-label="Yksikkö">${opts(NEED_UNITS, y.needUnit || 'm')}</select>
            </div>
          </label>
          ${listField('yarns', y, 'skeinsOwned', 'Keriä minulla', 'inputmode="decimal" placeholder="esim. 3"')}
        </div>
        <p class="calc" data-calc="${y.id}">${yarnCalcHTML(y)}</p>
      </div>`
    )
    .join('');
}

function toolsHTML(p) {
  if (!p.tools.length) return '<p class="muted">Valitse välineet omista tai merkitse ohjeen vaatimat välineet alta.</p>';
  return `<div class="tool-list">${p.tools.map((t) => toolRowHTML(t)).join('')}</div>`;
}

function toolRowHTML(t) {
  const it = t.inventoryId && state.inv.find((i) => i.id === t.inventoryId);
  const del = `<button class="icon-btn" data-action="del-tool" data-id="${t.id}" title="Poista työstä" aria-label="Poista väline työstä">✕</button>`;
  const status = `<div class="tool-status" data-tstatus="${t.id}">${toolStatusHTML(t)}</div>`;
  if (it) {
    return `
      <div class="tool-wrap">
        <div class="tool linked">
          <div class="tool-name"><strong>${esc(TOOL_TYPES[it.type])}</strong> ${esc(invLabel(it))}</div>
          <input data-list="tools" data-id="${t.id}" data-key="detail" value="${esc(t.detail)}" placeholder="Huomio, esim. resoriin" aria-label="Huomio">
          ${del}
        </div>
        ${status}
      </div>`;
  }
  return `
    <div class="tool-wrap">
      <div class="tool">
        <select data-list="tools" data-id="${t.id}" data-key="type" aria-label="Väline">${opts(TOOL_TYPES, t.type)}</select>
        <input data-list="tools" data-id="${t.id}" data-key="size" value="${esc(t.size)}" placeholder="${t.type === 'merkit' ? 'Määrä / väri' : 'Koko, esim. 3,5 mm'}" aria-label="Koko" ${t.type === 'merkit' || t.type === 'muu' ? '' : 'inputmode="decimal"'}>
        <input data-list="tools" data-id="${t.id}" data-key="detail" value="${esc(t.detail)}" placeholder="${t.type === 'pyoropuikot' ? 'Pituus, esim. 80 cm' : 'Lisätieto'}" aria-label="Lisätieto">
        ${del}
      </div>
      ${status}
    </div>`;
}

function otherUsers(invId) {
  return projectsUsing(invId).filter((p) => p.id !== cur?.id && p.status === 'kesken');
}
const projLinks = (list) =>
  list.map((p) => `<a href="#/p/${p.id}">${esc(p.name || 'Nimetön työ')}</a>`).join(', ');

function toolStatusHTML(t) {
  if (!INV_TYPES.includes(t.type)) return '';
  if (t.inventoryId) {
    const it = state.inv.find((i) => i.id === t.inventoryId);
    if (!it) return '<span class="warn">✗ Linkitetty väline on poistettu omista välineistä</span>';
    const others = otherUsers(it.id);
    return '<span class="ok">✓ Omistat</span>' +
      (others.length ? ` <span class="caution">· käytössä myös: ${projLinks(others)}</span>` : '');
  }
  if (num(t.size) === null) return '<span class="muted">Syötä koko, niin tarkistan löytyykö se omista välineistä.</span>';
  const match = state.inv
    .filter((i) => i.type === t.type && sameSize(i.size, t.size))
    .sort((a, b) => otherUsers(a.id).length - otherUsers(b.id).length)[0];
  if (match) {
    const others = otherUsers(match.id);
    return `<span class="ok">✓ Sinulla on nämä</span>` +
      (others.length ? ` <span class="caution">(käytössä: ${projLinks(others)})</span>` : '') +
      ` <button class="btn tiny" data-action="link-tool" data-id="${t.id}" data-inv="${match.id}">Linkitä</button>`;
  }
  return `<span class="warn">✗ Ei omissa välineissä</span>
    <button class="btn tiny" data-action="tool-to-inv" data-id="${t.id}" title="Merkitse, että omistat tämän välineen">+ Lisää omiin</button>`;
}

function toolPickerHTML(p) {
  if (!state.inv.length) {
    return '<p class="muted small-text">Vinkki: tallenna omat puikkosi ja koukkusi <a href="#/valineet">Omat välineet</a> -sivulle, niin voit valita ne suoraan tähän.</p>';
  }
  const linked = new Set(p.tools.map((t) => t.inventoryId).filter(Boolean));
  const groups = INV_TYPES.map((type) => {
    const items = state.inv
      .filter((i) => i.type === type && !linked.has(i.id))
      .sort((a, b) => (num(a.size) ?? 999) - (num(b.size) ?? 999));
    if (!items.length) return '';
    return `<optgroup label="${esc(INV_LABELS[type])}">${items
      .map((i) => {
        const others = otherUsers(i.id);
        return `<option value="${i.id}">${esc(invLabel(i))}${others.length ? ` (käytössä: ${esc(others.map((o) => o.name || 'Nimetön työ').join(', '))})` : ''}</option>`;
      })
      .join('')}</optgroup>`;
  }).join('');
  if (!groups) return '';
  return `<select id="toolPicker" class="picker" aria-label="Valitse omista välineistä">
      <option value="">+ Valitse omista välineistä…</option>${groups}
    </select>`;
}

// ---------- Omat välineet -näkymä ----------
async function showInventory() {
  cur = null;
  document.title = 'Omat välineet – Neulemuistio';
  await loadInv();
  state.allProjects = (await db.all('projects')).map(normalize);
  app.innerHTML = `
    <header class="topbar">
      <h1><img src="icon.svg" alt="" class="logo"> Neulemuistio</h1>
    </header>
    ${navHTML('inv')}
    <p class="muted intro">Tallenna tänne omistamasi puikot ja koukut. Töissä voit valita ne käyttöön, ja näet heti mitkä ovat vapaana ja mitä puuttuu.</p>
    ${INV_TYPES.map((type) => `
      <section class="panel inv-panel">
        <div class="panel-head">
          <h2>${esc(INV_LABELS[type])} <span class="count" data-count="${type}"></span></h2>
          <button class="btn small" data-action="inv-add" data-type="${type}">+ Lisää</button>
        </div>
        <div data-inv-section="${type}">${invListHTML(type)}</div>
      </section>`).join('')}`;
  updateCounts();
}

function updateCounts() {
  INV_TYPES.forEach((type) => {
    const el = app.querySelector(`[data-count="${type}"]`);
    const n = state.inv.filter((i) => i.type === type).length;
    if (el) el.textContent = n ? `(${n})` : '';
  });
}

function invListHTML(type) {
  const items = state.inv
    .filter((i) => i.type === type)
    .sort((a, b) => (num(a.size) ?? 999) - (num(b.size) ?? 999) || (num(a.length) ?? 0) - (num(b.length) ?? 0));
  if (!items.length) return '<p class="muted">Ei vielä yhtään.</p>';
  const lengthLabel = type === 'pyoropuikot' ? 'Pituus (cm)' : 'Pituus (cm)';
  return items.map((it) => `
    <div class="inv-item">
      <div class="inv-fields">
        <label class="field size"><span>Koko (mm)</span><input data-inv="${it.id}" data-key="size" value="${esc(it.size)}" inputmode="decimal" placeholder="3,5"></label>
        ${type !== 'koukku' ? `<label class="field size"><span>${lengthLabel}</span><input data-inv="${it.id}" data-key="length" value="${esc(it.length)}" inputmode="decimal" placeholder="${type === 'pyoropuikot' ? '80' : type === 'sukkapuikot' ? '20' : '35'}"></label>` : ''}
        <label class="field"><span>Materiaali / merkki</span><input data-inv="${it.id}" data-key="material" value="${esc(it.material)}" placeholder="esim. bambu, KnitPro"></label>
        <button class="icon-btn" data-action="inv-del" data-id="${it.id}" title="Poista omista välineistä" aria-label="Poista väline">✕</button>
      </div>
      <div class="inv-usage">${invUsageHTML(it)}</div>
    </div>`).join('');
}

function invUsageHTML(it) {
  const users = projectsUsing(it.id).filter((p) => p.status !== 'valmis');
  if (!users.length) return '<span class="ok">Vapaana</span>';
  return users
    .map((p) => `<a class="use-chip s-${p.status}" href="#/p/${p.id}">${esc(p.name || 'Nimetön työ')} · ${STATUSES[p.status]}</a>`)
    .join(' ');
}

function notesHTML(p) {
  if (!p.notes.length) return '';
  return `<ul class="notes">${[...p.notes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (n) => `
      <li>
        <div class="note-head">
          <time>${new Date(n.date).toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
          <button class="icon-btn" data-action="del-note" data-id="${n.id}" title="Poista muistiinpano" aria-label="Poista muistiinpano">✕</button>
        </div>
        <p>${esc(n.text)}</p>
      </li>`
    )
    .join('')}</ul>`;
}

function refresh(section) {
  const el = app.querySelector(`[data-section="${section}"]`);
  if (!el || !cur) return;
  const render = { toolPicker: toolPickerHTML, photos: photosHTML, patternFiles: patternFilesHTML, yarns: yarnsHTML, tools: toolsHTML, notes: notesHTML }[section];
  el.innerHTML = render(cur);
  hydrate(el);
  if (section === 'tools') {
    const picker = app.querySelector('[data-section="toolPicker"]');
    if (picker) picker.innerHTML = toolPickerHTML(cur);
  }
}

// ---------- Syötteet ----------
app.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'search') {
    state.search = el.value;
    renderGrid();
    return;
  }
  if (el.dataset.inv) {
    const it = state.inv.find((i) => i.id === el.dataset.inv);
    if (it) {
      it[el.dataset.key] = el.value;
      saveInv(it);
    }
    return;
  }
  if (!cur) return;
  if (el.dataset.field) {
    const path = el.dataset.field.split('.');
    let obj = cur;
    while (path.length > 1) obj = obj[path.shift()];
    obj[path[0]] = el.value;
    if (el.dataset.field === 'name') document.title = (el.value || 'Nimetön työ') + ' – Neulemuistio';
    if (el.dataset.field === 'pattern.url') {
      const a = document.getElementById('openUrl');
      const u = safeUrl(el.value);
      if (u) {
        a.href = u;
        a.removeAttribute('aria-disabled');
      } else {
        a.removeAttribute('href');
        a.setAttribute('aria-disabled', 'true');
      }
    }
    save();
  } else if (el.dataset.list) {
    const item = cur[el.dataset.list].find((i) => i.id === el.dataset.id);
    if (!item) return;
    item[el.dataset.key] = el.value;
    if (el.dataset.list === 'yarns') {
      const calc = app.querySelector(`[data-calc="${item.id}"]`);
      if (calc) calc.innerHTML = yarnCalcHTML(item);
    }
    if (el.dataset.list === 'tools') {
      if (el.dataset.key === 'type') {
        // päivitä vihjetekstit uuden välinetyypin mukaan
        refresh('tools');
      } else {
        const st = app.querySelector(`[data-tstatus="${item.id}"]`);
        if (st) st.innerHTML = toolStatusHTML(item);
      }
    }
    save();
  }
});

app.addEventListener('change', (e) => {
  if (e.target.id !== 'toolPicker' || !cur) return;
  const it = state.inv.find((i) => i.id === e.target.value);
  if (!it) return;
  cur.tools.push({ id: uid(), type: it.type, size: it.size, detail: '', inventoryId: it.id });
  save(true);
  refresh('tools');
});

app.addEventListener('keydown', (e) => {
  if (e.target.id === 'noteText' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    actions['add-note']();
  }
});

// ---------- Toiminnot ----------
const actions = {
  async new() {
    const p = newProject();
    await db.put('projects', p);
    location.hash = '#/p/' + p.id;
  },
  back() {
    location.hash = '#/';
  },
  filter(el) {
    state.filter = el.dataset.status;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === el));
    renderGrid();
  },
  async 'delete-project'() {
    if (!confirm(`Poistetaanko työ ”${cur.name || 'Nimetön työ'}” pysyvästi? Myös sen kuvat poistetaan.`)) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const p = cur;
    cur = null;
    for (const id of [...p.photos, ...p.pattern.files.map((f) => f.id)]) await removeFile(id);
    await db.del('projects', p.id);
    location.hash = '#/';
    toast('Työ poistettu');
  },

  'add-photo'() {
    document.getElementById('photoInput').click();
  },
  async 'del-photo'(el) {
    if (!confirm('Poistetaanko kuva?')) return;
    cur.photos = cur.photos.filter((id) => id !== el.dataset.id);
    await removeFile(el.dataset.id);
    await save(true);
    refresh('photos');
  },
  async cover(el) {
    cur.photos = [el.dataset.id, ...cur.photos.filter((id) => id !== el.dataset.id)];
    await save(true);
    refresh('photos');
  },
  async view(el) {
    const id = el.dataset.id;
    const u = await fileURL(id);
    if (!u) return;
    const lb = document.getElementById('lightbox');
    lb.querySelector('img').src = u;
    lb.hidden = false;
  },
  'close-lightbox'() {
    document.getElementById('lightbox').hidden = true;
  },

  'add-pattern-file'() {
    document.getElementById('patternInput').click();
  },
  async 'del-pattern-file'(el) {
    if (!confirm('Poistetaanko ohjetiedosto?')) return;
    cur.pattern.files = cur.pattern.files.filter((f) => f.id !== el.dataset.id);
    await removeFile(el.dataset.id);
    await save(true);
    refresh('patternFiles');
  },

  'add-yarn'() {
    cur.yarns.push({
      id: uid(), brand: '', name: '', color: '', lot: '', fiber: '',
      metersPerSkein: '', gramsPerSkein: '', needAmount: '', needUnit: 'm', skeinsOwned: '',
    });
    save(true);
    refresh('yarns');
    const items = app.querySelectorAll('[data-section="yarns"] .item');
    items[items.length - 1]?.querySelector('input')?.focus();
  },
  'del-yarn'(el) {
    const y = cur.yarns.find((i) => i.id === el.dataset.id);
    const name = y && [y.brand, y.name].filter(Boolean).join(' ');
    if (name && !confirm(`Poistetaanko lanka ”${name}”?`)) return;
    cur.yarns = cur.yarns.filter((i) => i.id !== el.dataset.id);
    save(true);
    refresh('yarns');
  },

  'add-tool'(el) {
    cur.tools.push({ id: uid(), type: el.dataset.type || 'puikot', size: '', detail: '' });
    save(true);
    refresh('tools');
    const rows = app.querySelectorAll('.tool');
    rows[rows.length - 1]?.querySelector('input')?.focus();
  },
  'del-tool'(el) {
    cur.tools = cur.tools.filter((t) => t.id !== el.dataset.id);
    save(true);
    refresh('tools');
  },
  'link-tool'(el) {
    const t = cur.tools.find((x) => x.id === el.dataset.id);
    const it = state.inv.find((i) => i.id === el.dataset.inv);
    if (!t || !it) return;
    t.inventoryId = it.id;
    t.type = it.type;
    t.size = it.size;
    save(true);
    refresh('tools');
  },
  async 'tool-to-inv'(el) {
    const t = cur.tools.find((x) => x.id === el.dataset.id);
    if (!t) return;
    const length = t.type !== 'koukku' ? (String(t.detail || '').match(/\d+([.,]\d+)?/) || [''])[0] : '';
    const it = { id: uid(), type: t.type, size: t.size, length, material: '', created: new Date().toISOString() };
    await saveInv(it, true);
    state.inv.push(it);
    t.inventoryId = it.id;
    save(true);
    refresh('tools');
    toast('Lisätty omiin välineisiin');
  },
  async 'inv-add'(el) {
    const type = el.dataset.type;
    const it = { id: uid(), type, size: '', length: '', material: '', created: new Date().toISOString() };
    await saveInv(it, true);
    state.inv.push(it);
    // uusi rivi listan loppuun, jotta lajittelu ei siirrä sitä kesken kirjoituksen
    const sec = app.querySelector(`[data-inv-section="${type}"]`);
    const tmp = document.createElement('div');
    const html = invListHTML(type);
    tmp.innerHTML = html;
    const newRow = [...tmp.querySelectorAll('.inv-item')].find((r) => r.querySelector(`[data-inv="${it.id}"]`));
    if (sec.querySelector('.inv-item')) sec.appendChild(newRow);
    else sec.innerHTML = html;
    updateCounts();
    sec.querySelector(`[data-inv="${it.id}"]`)?.focus();
  },
  async 'inv-del'(el) {
    const it = state.inv.find((i) => i.id === el.dataset.id);
    if (!it) return;
    const users = projectsUsing(it.id);
    const msg = users.length
      ? `Poistetaanko ${TOOL_TYPES[it.type].toLowerCase()} ${invLabel(it)}? Ne on linkitetty ${users.length} työhön – töihin jää merkintä tarvittavasta koosta.`
      : `Poistetaanko ${TOOL_TYPES[it.type].toLowerCase()} ${invLabel(it)}?`;
    if (!confirm(msg)) return;
    clearTimeout(invTimers.get(it.id));
    invTimers.delete(it.id);
    await db.del('tools', it.id);
    state.inv = state.inv.filter((i) => i.id !== it.id);
    for (const p of users) {
      p.tools.forEach((t) => {
        if (t.inventoryId === it.id) {
          t.inventoryId = null;
          t.size = t.size || it.size;
        }
      });
      await persist(p);
    }
    app.querySelector(`[data-inv-section="${it.type}"]`).innerHTML = invListHTML(it.type);
    updateCounts();
  },

  'add-note'() {
    const ta = document.getElementById('noteText');
    const text = ta.value.trim();
    if (!text) {
      ta.focus();
      return;
    }
    cur.notes.push({ id: uid(), date: new Date().toISOString(), text });
    ta.value = '';
    save(true);
    refresh('notes');
  },
  'del-note'(el) {
    if (!confirm('Poistetaanko muistiinpano?')) return;
    cur.notes = cur.notes.filter((n) => n.id !== el.dataset.id);
    save(true);
    refresh('notes');
  },

  async export() {
    const projects = await db.all('projects');
    const files = await db.all('files');
    const data = {
      app: 'neulemuistio',
      version: 1,
      exported: new Date().toISOString(),
      projects,
      tools: await db.all('tools'),
      files: await Promise.all(
        files.map(async (f) => ({ id: f.id, name: f.name, type: f.type, data: await blobToDataURL(f.blob) }))
      ),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neulemuistio-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast('Varmuuskopio ladattu');
  },
  import() {
    document.getElementById('importInput').click();
  },
};

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  Promise.resolve(fn(el)).catch((err) => {
    console.error(err);
    toast('Jokin meni pieleen: ' + err.message);
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('lightbox').hidden = true;
});

// ---------- Tiedostovalinnat ----------
document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!cur || !files.length) return;
  const p = cur;
  const stored = await storeFiles(files);
  p.photos.push(...stored.map((f) => f.id));
  await persist(p);
  if (p === cur) refresh('photos');
});

document.getElementById('patternInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!cur || !files.length) return;
  const p = cur;
  p.pattern.files.push(...(await storeFiles(files)));
  await persist(p);
  if (p === cur) refresh('patternFiles');
});

document.getElementById('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'neulemuistio' || !Array.isArray(data.projects)) throw new Error('Tiedosto ei ole Neulemuistion varmuuskopio.');
    if (!confirm(`Tuodaanko ${data.projects.length} työtä? Jos sama työ on jo olemassa, se korvataan varmuuskopion versiolla.`)) return;
    for (const f of data.files || []) {
      const blob = await (await fetch(f.data)).blob();
      await db.put('files', { id: f.id, name: f.name, type: f.type, blob });
    }
    for (const p of data.projects) await db.put('projects', normalize(p));
    for (const t of data.tools || []) await db.put('tools', t);
    toast(`Tuotu ${data.projects.length} työtä`);
    route();
  } catch (err) {
    alert('Tuonti epäonnistui: ' + err.message);
  }
});

// ---------- Käynnistys ----------
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
route();
