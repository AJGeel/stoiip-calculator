// STOIIP calculator — volumetric oil in place with Monte Carlo uncertainty.
// Internal state is always SI-ish: length/width in km, thickness in m, fractions 0–1.

const M3_TO_BBL = 6.28981;
const KM2_TO_ACRE = 247.105;
const M_TO_FT = 3.28084;
const KM_TO_MI = 0.621371;

const PARAMS = [
  { key: 'len', label: 'Length', sym: 'L', log: true, min: 0.3, max: 80, spread: 10,
    units: { metric: { u: 'km', f: 1, dp: 2 }, field: { u: 'mi', f: KM_TO_MI, dp: 2 } } },
  { key: 'wid', label: 'Width', sym: 'W', log: true, min: 0.2, max: 40, spread: 10,
    units: { metric: { u: 'km', f: 1, dp: 2 }, field: { u: 'mi', f: KM_TO_MI, dp: 2 } } },
  { key: 'h', label: 'Gross thickness', sym: 'h', min: 2, max: 400, step: 1, spread: 15,
    units: { metric: { u: 'm', f: 1, dp: 0 }, field: { u: 'ft', f: M_TO_FT, dp: 0 } } },
  { key: 'gf', label: 'Geometry factor', sym: 'GF', pct: true, min: 0.2, max: 1, step: 0.01, spread: 10 },
  { key: 'ntg', label: 'Net-to-gross', short: 'Net sand', sym: 'N/G', pct: true, min: 0.05, max: 1, step: 0.01, spread: 15 },
  { key: 'phi', label: 'Porosity', sym: 'φ', pct: true, min: 0.02, max: 0.4, step: 0.005, spread: 12 },
  { key: 'sw', label: 'Water saturation', sym: 'Sw', pct: true, min: 0.05, max: 0.9, step: 0.01, spread: 15 },
  { key: 'bo', label: 'Oil formation volume factor', sym: 'Bo', min: 1, max: 2.5, step: 0.01, spread: 5,
    units: { metric: { u: 'rm³/sm³', f: 1, dp: 2 }, field: { u: 'rb/stb', f: 1, dp: 2 } } },
  { key: 'rf', label: 'Recovery factor', sym: 'RF', pct: true, min: 0.05, max: 0.7, step: 0.01, spread: 20 },
];

const PRESETS = [
  { name: 'North Sea sandstone', v: { len: 7.5, wid: 4, h: 80, gf: 0.7, ntg: 0.7, phi: 0.24, sw: 0.25, bo: 1.3, rf: 0.45 } },
  { name: 'Giant carbonate', v: { len: 40, wid: 15, h: 150, gf: 0.6, ntg: 0.85, phi: 0.18, sw: 0.2, bo: 1.4, rf: 0.4 } },
  { name: 'Deepwater turbidite', v: { len: 8, wid: 5, h: 100, gf: 0.7, ntg: 0.75, phi: 0.27, sw: 0.2, bo: 1.5, rf: 0.4 } },
  { name: 'Small onshore', v: { len: 2.5, wid: 1.6, h: 20, gf: 0.8, ntg: 0.6, phi: 0.2, sw: 0.35, bo: 1.1, rf: 0.3 } },
];

const state = {
  units: 'field',
  v: { ...PRESETS[0].v },
  spread: Object.fromEntries(PARAMS.map(p => [p.key, p.spread])),
};

const $ = (s, el = document) => el.querySelector(s);

// ---------- Core maths ----------
const areaKm2 = v => v.len * v.wid;

function compute(v) {
  const grv = areaKm2(v) * 1e6 * v.h;       // m³
  const bulk = grv * v.gf;
  const net = bulk * v.ntg;
  const pv = net * v.phi;
  const hcpv = pv * (1 - v.sw);
  const stoiip = hcpv / v.bo;               // Sm³
  return { grv, bulk, net, pv, hcpv, stoiip, rec: stoiip * v.rf };
}

// Volume in the display unit system, scaled to millions (MMbbl or 10⁶ m³).
const toDisplay = m3 => (state.units === 'field' ? m3 * M3_TO_BBL : m3) / 1e6;

function fmt(n, dp) {
  if (!isFinite(n)) return '—';
  if (dp === undefined) dp = Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 10 ? 1 : 2;
  return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function volUnit(kind) {
  // kind: 'res' (reservoir conditions) or 'st' (stock tank)
  if (state.units === 'field') return kind === 'st' ? 'MMSTB' : 'MMrb';
  return kind === 'st' ? '10⁶ Sm³' : '10⁶ rm³';
}

// ---------- Inputs ----------
const sliderRes = 1000;
function toSlider(p, val) {
  if (p.log) return Math.round(Math.log(val / p.min) / Math.log(p.max / p.min) * sliderRes);
  return val;
}
function fromSlider(p, s) {
  if (p.log) return p.min * Math.pow(p.max / p.min, s / sliderRes);
  return +s;
}
function dispFactor(p) { return p.pct ? 100 : p.units ? p.units[state.units].f : 1; }
function dispUnit(p) { return p.pct ? '%' : p.units ? p.units[state.units].u : ''; }
function dispDp(p) {
  if (p.pct) return p.key === 'phi' ? 1 : 0;
  return p.units ? p.units[state.units].dp : 2;
}

function buildParams() {
  const host = $('#params');
  host.innerHTML = '';
  for (const p of PARAMS) {
    const row = document.createElement('div');
    row.className = 'param';
    row.innerHTML = `
      <div class="param-top">
        <label class="param-label" for="n-${p.key}">${p.label} <span class="sym">${p.sym}</span></label>
        <div class="field-wrap">
          <input id="n-${p.key}" type="number" inputmode="decimal" />
          <span class="u"></span>
        </div>
      </div>
      <input id="r-${p.key}" type="range" aria-label="${p.label}" />
      ${p.key === 'wid' ? '<div class="derived">Area <span class="sym">A = L × W</span><span id="areaOut"></span></div>' : ''}`;
    host.appendChild(row);

    const num = $(`#n-${p.key}`, row), rng = $(`#r-${p.key}`, row);
    if (p.log) { rng.min = 0; rng.max = sliderRes; rng.step = 1; }
    else { rng.min = p.min; rng.max = p.max; rng.step = p.step; }

    rng.addEventListener('input', () => {
      state.v[p.key] = fromSlider(p, rng.value);
      clearPreset();
      syncParam(p, { skipRange: true });
      update();
    });
    num.addEventListener('change', () => {
      let val = parseFloat(num.value) / dispFactor(p);
      if (!isFinite(val)) val = state.v[p.key];
      state.v[p.key] = Math.min(p.max, Math.max(p.min, val));
      clearPreset();
      syncParam(p);
      update();
    });
  }
}

function syncParam(p, { skipRange = false } = {}) {
  const num = $(`#n-${p.key}`), rng = $(`#r-${p.key}`);
  const val = state.v[p.key];
  if (document.activeElement !== num) num.value = (val * dispFactor(p)).toFixed(dispDp(p));
  num.nextElementSibling.textContent = dispUnit(p);
  if (!skipRange) rng.value = toSlider(p, val);
  const pct = (rng.value - rng.min) / (rng.max - rng.min) * 100;
  rng.style.setProperty('--p', pct + '%');
}
const syncAll = () => PARAMS.forEach(p => syncParam(p));

function buildPresets() {
  const host = $('#presets');
  PRESETS.forEach((pr, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.textContent = pr.name;
    b.addEventListener('click', () => {
      state.v = { ...pr.v };
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      syncAll();
      update();
    });
    host.appendChild(b);
  });
}
const clearPreset = () => document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));

function buildUnits() {
  const btns = document.querySelectorAll('.unit-btn');
  const thumb = $('.unit-thumb');
  const place = () => {
    const a = $('.unit-btn.active');
    thumb.style.width = a.offsetWidth + 'px';
    thumb.style.transform = `translateX(${a.offsetLeft - 4}px)`;
  };
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); });
    state.units = b.dataset.units;
    place();
    syncAll();
    update();
  }));
  place();
  document.fonts?.ready.then(place);
  addEventListener('resize', place);
}

// ---------- Animated numbers ----------
const tweens = new Map();
function tweenText(el, to, format) {
  const from = tweens.get(el)?.value ?? 0;
  const start = performance.now(), dur = 550;
  const rec = { value: from };
  tweens.set(el, rec);
  const step = now => {
    if (tweens.get(el) !== rec) return;
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    rec.value = from + (to - from) * e;
    el.textContent = format(rec.value);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Cross-section ----------
const CREST_X = 320, CREST_Y = 72, FLANK_Y = 206, SIGMA = 170, RES_T = 42;
const topY = x => FLANK_Y - (FLANK_Y - CREST_Y) * Math.exp(-(((x - CREST_X) / SIGMA) ** 2));

function curve(offset) {
  const pts = [];
  for (let x = -10; x <= 650; x += 10) pts.push([x, topY(x) + offset]);
  return pts;
}
const ptsToPath = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
function band(a, b) {
  const top = curve(a), bot = curve(b).reverse();
  return ptsToPath(top) + ' ' + bot.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';
}

function buildSection() {
  const g = $('#strata');
  const layers = [
    [-200, -60, '#1c1612'], [-60, -30, '#241c16'],
    [-30, 0, 'url(#shale)', '#2a221b'],   // cap rock
    [RES_T, RES_T + 22, '#1f1813'], [RES_T + 22, RES_T + 60, '#17120e'], [RES_T + 60, 400, '#120e0b'],
  ];
  g.innerHTML = layers.map(([a, b, fill, base]) =>
    (base ? `<path d="${band(a, b)}" fill="${base}"/>` : '') + `<path d="${band(a, b)}" fill="${fill}"/>`
  ).join('');
  const res = band(0, RES_T);
  $('#resPath').setAttribute('d', res);
  $('#resOutline').setAttribute('d', res);
  $('#crestLabel').setAttribute('y', CREST_Y - 36);
}

function updateSection(v) {
  const so = 1 - v.sw;
  // Map oil saturation to an oil-water contact depth between the crest and spill point.
  const owc = CREST_Y + 8 + so * (FLANK_Y - 20 - CREST_Y);
  $('#waterG').style.transform = `translateY(${owc}px)`;
  $('#owcLabel').style.transform = `translateY(${owc}px)`;
  $('#grainRect').style.opacity = Math.min(1, 0.25 + v.phi * 2.4);
}

// ---------- Cascade ----------
function updateCascade(r, v) {
  const rows = [
    { name: 'Gross rock volume', sub: 'GRV = L × W × h', val: r.grv, kind: 'res' },
    { name: 'Trap volume', sub: '× GF', val: r.bulk, op: `× ${fmt(v.gf * 100, 0)}% geometry`, kind: 'res' },
    { name: 'Net rock volume', sub: '× N/G', val: r.net, op: `× ${fmt(v.ntg * 100, 0)}% net sand`, kind: 'res' },
    { name: 'Pore volume', sub: '× φ', val: r.pv, op: `× ${fmt(v.phi * 100, 1)}% porosity`, kind: 'res' },
    { name: 'Hydrocarbon pore vol.', sub: '× (1 − Sw)', val: r.hcpv, op: `× ${fmt((1 - v.sw) * 100, 0)}% oil saturation`, kind: 'res' },
    { name: 'STOIIP', sub: '÷ Bo', val: r.stoiip, op: `÷ ${fmt(v.bo, 2)} shrinkage to surface`, kind: 'st', final: true },
  ];
  const host = $('#cascade');
  if (!host.children.length) {
    host.innerHTML = rows.map((row, i) => `
      ${row.op ? `<div class="c-op" data-op="${i}"></div>` : ''}
      <div class="c-row${row.final ? ' final' : ''}" data-row="${i}">
        <div class="c-name">${row.name}<small>${row.sub}</small></div>
        <div class="c-track"><div class="c-bar" style="width:0"></div></div>
        <div class="c-val"><span></span><small></small></div>
      </div>`).join('');
  }
  rows.forEach((row, i) => {
    const el = $(`[data-row="${i}"]`, host);
    const pct = row.val / r.grv * 100;
    $('.c-bar', el).style.width = Math.max(0.4, pct) + '%';
    $('.c-val span', el).textContent = fmt(toDisplay(row.val));
    $('.c-val small', el).textContent = `${volUnit(row.kind)} · ${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%`;
    if (row.op) $(`[data-op="${i}"]`, host).textContent = row.op;
  });
}

// ---------- Formula ----------
function updateFormula(v, r) {
  const f = state.units === 'field';
  const A = f ? areaKm2(v) * KM2_TO_ACRE : areaKm2(v) * 1e6;
  const h = f ? v.h * M_TO_FT : v.h;
  const pre = f ? '7,758 × ' : '';
  const res = f ? `${fmt(r.stoiip * M3_TO_BBL / 1e6)} MMSTB` : `${fmt(r.stoiip / 1e6)} × 10⁶ Sm³`;
  const lu = f ? 'mi' : 'km', lf = f ? KM_TO_MI : 1;
  $('#formula').innerHTML = `
    <div class="f-line">A = L · W = <b>${(v.len * lf).toFixed(2)}</b> ${lu} · <b>${(v.wid * lf).toFixed(2)}</b> ${lu} = <span class="res">${fmt(A, 0)} ${f ? 'ac' : 'm²'}</span></div>
    <div class="f-line">STOIIP = ${pre}A · h · GF · N/G · φ · (1 − S<sub>w</sub>) / B<sub>o</sub></div>
    <div class="f-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = ${pre}<b>${fmt(A, 0)}</b> ${f ? 'ac' : 'm²'} · <b>${fmt(h, 0)}</b> ${f ? 'ft' : 'm'} · <b>${v.gf.toFixed(2)}</b> · <b>${v.ntg.toFixed(2)}</b> · <b>${v.phi.toFixed(3)}</b> · (1 − <b>${v.sw.toFixed(2)}</b>) / <b>${v.bo.toFixed(2)}</b></div>
    <div class="f-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span class="res">${res}</span></div>`;
}

// ---------- Monte Carlo ----------
const N_SAMPLES = 20000;
function triangular(a, c, b) {
  if (b - a < 1e-12) return c;
  const u = Math.random(), F = (c - a) / (b - a);
  return u < F ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

function buildSpreads() {
  $('#spreads').innerHTML = PARAMS.map(p => `
    <label class="spread"><span>${p.short || p.label.split(' ')[0]} <span class="sym">${p.sym}</span></span>
      <span>±<input type="number" min="0" max="80" step="1" value="${state.spread[p.key]}" data-k="${p.key}" aria-label="${p.label} spread percent">%</span>
    </label>`).join('');
  $('#spreads').addEventListener('change', e => {
    const k = e.target.dataset.k;
    if (!k) return;
    const val = Math.min(80, Math.max(0, parseFloat(e.target.value) || 0));
    e.target.value = val;
    state.spread[k] = val;
    runMC();
  });
  $('#rerun').addEventListener('click', runMC);
  $('#mcN').textContent = `${N_SAMPLES.toLocaleString()} trials.`;
}

let mcResult = null;
function runMC() {
  const out = new Float64Array(N_SAMPLES), rec = new Float64Array(N_SAMPLES);
  for (let i = 0; i < N_SAMPLES; i++) {
    const s = {};
    for (const p of PARAMS) {
      const base = state.v[p.key], d = state.spread[p.key] / 100;
      let lo = base * (1 - d), hi = base * (1 + d);
      if (p.pct) { lo = Math.max(0, lo); hi = Math.min(1, hi); }
      if (p.key === 'bo') lo = Math.max(1, lo);
      s[p.key] = triangular(lo, base, hi);
    }
    const st = s.len * s.wid * 1e6 * s.h * s.gf * s.ntg * s.phi * (1 - s.sw) / s.bo;
    out[i] = st; rec[i] = st * s.rf;
  }
  const sorted = Float64Array.from(out).sort();
  const sortedRec = Float64Array.from(rec).sort();
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  mcResult = {
    sorted,
    // Exceedance convention: P90 is the value exceeded with 90% probability (low case).
    p90: q(sorted, 0.1), p50: q(sorted, 0.5), p10: q(sorted, 0.9),
    r90: q(sortedRec, 0.1), r50: q(sortedRec, 0.5), r10: q(sortedRec, 0.9),
    mean: out.reduce((a, b) => a + b, 0) / N_SAMPLES,
  };
  renderMC();
}

function renderMC() {
  if (!mcResult) return;
  const m = mcResult, u = volUnit('st');
  const card = (label, val, recv, cls = '') => `
    <div class="pcard ${cls}">
      <span class="eyebrow">${label}</span>
      <div class="pv">${fmt(toDisplay(val))}<small>${u}</small></div>
      <div class="pr">Recoverable ${fmt(toDisplay(recv))}</div>
    </div>`;
  $('#pcards').innerHTML =
    card('P90 · low', m.p90, m.r90) + card('P50 · best', m.p50, m.r50, 'mid') + card('P10 · high', m.p10, m.r10);
  drawHist();
}

function drawHist() {
  const svg = $('#hist'), tip = $('#tip');
  const W = svg.clientWidth || 600, H = 260;
  const pad = { l: 8, r: 8, t: 28, b: 28 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const m = mcResult, data = m.sorted;
  const lo = toDisplay(data[Math.floor(data.length * 0.005)]);
  const hi = toDisplay(data[Math.floor(data.length * 0.995)]);
  const bins = W < 500 ? 30 : 48;
  const bw = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const d of data) {
    const x = toDisplay(d);
    const i = Math.floor((x - lo) / bw);
    if (i >= 0 && i < bins) counts[i]++;
  }
  const maxC = Math.max(...counts);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const sx = x => pad.l + (x - lo) / (hi - lo) * iw;
  const colW = iw / bins;
  const gap = Math.min(2, colW * 0.25);

  let html = '';
  counts.forEach((c, i) => {
    const h = c / maxC * ih;
    const x = pad.l + i * colW + gap / 2, w = colW - gap, y = pad.t + ih - h;
    const r = Math.min(4, w / 2, h);
    if (h > 0) {
      html += `<path class="hbar" data-i="${i}" d="M${x} ${pad.t + ih} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${pad.t + ih} Z"/>`;
    }
  });
  // Axis ticks
  const ticks = niceTicks(lo, hi, W < 500 ? 4 : 6);
  html += `<g class="axis"><line x1="${pad.l}" x2="${W - pad.r}" y1="${pad.t + ih + .5}" y2="${pad.t + ih + .5}"/>`;
  ticks.forEach(t => {
    const x = sx(t);
    if (x < pad.l - 1 || x > W - pad.r + 1) return;
    html += `<text x="${x}" y="${H - 8}" text-anchor="middle">${fmt(t, t % 1 ? 1 : 0)}</text>`;
  });
  html += `</g>`;
  // P-lines
  [['P90', m.p90], ['P50', m.p50], ['P10', m.p10]].forEach(([lab, val]) => {
    const x = sx(toDisplay(val));
    html += `<line class="pline" x1="${x}" x2="${x}" y1="${pad.t - 6}" y2="${pad.t + ih}"/>
             <text class="plabel" x="${x}" y="${pad.t - 12}" text-anchor="middle">${lab}</text>`;
  });
  // Hit targets (full column height)
  counts.forEach((c, i) => {
    html += `<rect class="hhit" data-i="${i}" x="${pad.l + i * colW}" y="${pad.t}" width="${colW}" height="${ih}"/>`;
  });
  svg.innerHTML = html;

  svg.onmousemove = e => {
    const i = e.target.dataset?.i;
    if (i === undefined) { tip.hidden = true; return; }
    const a = lo + i * bw, b = a + bw;
    svg.querySelectorAll('.hbar').forEach(el => el.classList.toggle('dim', el.dataset.i !== i));
    tip.hidden = false;
    tip.innerHTML = `${fmt(a)} – ${fmt(b)} ${volUnit('st')}<br><span class="t-sub">${(counts[i] / data.length * 100).toFixed(1)}% of trials</span>`;
    const rect = svg.getBoundingClientRect();
    const barTop = pad.t + ih - counts[i] / maxC * ih;
    tip.style.left = Math.min(rect.width - 90, Math.max(90, (pad.l + (+i + 0.5) * colW) / W * rect.width)) + 'px';
    tip.style.top = (barTop / H * rect.height) + 'px';
  };
  svg.onmouseleave = () => {
    tip.hidden = true;
    svg.querySelectorAll('.hbar').forEach(el => el.classList.remove('dim'));
  };
}

function niceTicks(lo, hi, n) {
  const span = hi - lo, raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => span / s <= n) || mag * 10;
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(+t.toFixed(10));
  return out;
}

// ---------- Update loop ----------
let mcTimer;
function update() {
  const v = state.v, r = compute(v);
  const st = toDisplay(r.stoiip), rec = toDisplay(r.rec);
  tweenText($('#heroVal'), st, x => fmt(x));
  tweenText($('#recVal'), rec, x => fmt(x));
  tweenText($('#soVal'), (1 - v.sw) * 100, x => x.toFixed(0));
  $('#heroUnit').textContent = volUnit('st');
  $('#recUnit').textContent = volUnit('st');
  $('#heroSub').textContent = state.units === 'field'
    ? `≈ ${fmt(r.stoiip / 1e6)} × 10⁶ Sm³ · GRV ${fmt(r.grv / 1233.48 / 1e3, 0)}k acre-ft`
    : `≈ ${fmt(r.stoiip * M3_TO_BBL / 1e6)} MMSTB · GRV ${fmt(r.grv / 1e9, 2)} km³`;
  const a = areaKm2(v);
  $('#areaOut').textContent = state.units === 'field'
    ? `${fmt(a * KM2_TO_ACRE, 0)} acres`
    : `${fmt(a, a < 10 ? 2 : 1)} km²`;
  updateSection(v);
  updateCascade(r, v);
  updateFormula(v, r);
  clearTimeout(mcTimer);
  mcTimer = setTimeout(runMC, 120);
}

buildPresets();
buildParams();
buildUnits();
buildSpreads();
buildSection();
syncAll();
update();
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => mcResult && drawHist(), 100); });
