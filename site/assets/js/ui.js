/* Solco UI kit for the page and the film: helpers, easing, waveform painters.
   Every demo is a pure function of time, so the page and the film share it. */
(function () {
  const S = window.SOLCO, IC = window.ICONS;
  const I = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${(IC[n] || '').replace(/#ffffff/g, 'currentColor').replace(/#111820/g, 'var(--bg-1)')}</svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = n => Math.round(n).toLocaleString('en-US');
  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    out: k => 1 - Math.pow(1 - k, 3),
    out5: k => 1 - Math.pow(1 - k, 5),
    inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
    in: k => k * k * k,
    // critically damped settle with a whisper of overshoot, for things that "land"
    land: k => { if (k <= 0) return 0; if (k >= 1) return 1; return 1 - Math.exp(-7 * k) * Math.cos(k * 9.5) * (1 - k) - 0 * k; },
  };
  // the Camelot wheel's colours, as the app draws keys (the same for A and B)
  const WHEEL = ['#e85d75', '#ef7846', '#f0a13c', '#e4c53a', '#9dc950', '#59c672', '#42c1a5', '#40acd5', '#588fe8', '#8378e7', '#b06dd9', '#d262b4'];
  const keyColor = c => { const n = parseInt(c); return n ? WHEEL[(n - 1) % 12] : 'var(--text-1)'; };
  // one colour scale for every 0 to 100 reading: blue at 0, violet in the middle, orange at 100
  const STOPS = [[0x4f, 0x7c, 0xff], [0xb9, 0x8c, 0xf0], [0xff, 0x8a, 0x4c]];
  const charColor = v => {
    const k = clamp(v / 100) * 2, i = Math.min(1, Math.floor(k)), f = k - i;
    const a = STOPS[i], b = STOPS[i + 1];
    return `rgb(${a.map((x, j) => Math.round(lerp(x, b[j], f))).join(',')})`;
  };
  const FEELPOS = { Moody: [0, 0], Mellow: [1, 0], Warm: [2, 0], Brooding: [0, 1], Steady: [1, 1], Uplifting: [2, 1], Tense: [0, 2], Driving: [1, 2], Euphoric: [2, 2] };
  const feelHtml = f => { const p = FEELPOS[f] || [1, 1]; return f ? `<span class="feelg"><i style="--fx:${2 + p[0] * 4}px;--fy:${8 - p[1] * 3.5}px"></i>${f}</span>` : ''; };
  const keyHtml = k => k ? `<span class="key" style="color:${keyColor(k)}">${k}</span>` : '<span class="muted">–</span>';
  const bpmf = b => (!Number.isFinite(b) ? '–' : Math.abs(b - Math.round(b)) < 0.05 ? String(Math.round(b)) : b.toFixed(1));

  /* ---------- waveform: Solco's own look (Solco ADRs 0252, 0257, 0261) ----------
     A column's height comes from its RMS level (rms^0.62) at the gain the track plays
     at; the bands share it out by their share of the column: blue lows from 44% to all
     of it, orange mids from 18% to 76%, a light core of highs from 3% to 32%. */
  const energyOf = rms => Math.pow(clamp(rms), 0.62);
  const NEUTRAL = [0.5, 0.32, 0.18];
  const layersOf = c => {
    const e = [c[1], c[2], c[3]].map(x => Math.pow(Math.max(0, x), 1.45)), t = e[0] + e[1] + e[2];
    const sh = t > 1e-9 ? e.map(x => x / t) : NEUTRAL;
    return [0.44 + 0.56 * Math.sqrt(sh[0]), 0.18 + 0.58 * Math.sqrt(sh[1]), 0.03 + 0.29 * Math.sqrt(sh[2])];
  };
  // the gain the deck plays a track at: to -9 LUFS, at most +6 dB
  const gainOf = d => Math.pow(10, clamp(-9 - (d.lufs ?? -9), -18, 6) / 20);
  // colours come from the interface theme the canvas sits in (graphite or paper)
  const themeOf = cv => {
    const cs = getComputedStyle(cv), g = k => cs.getPropertyValue(k).trim();
    return { low: g('--wf-low') || '#1857e8', mid: g('--wf-mid') || '#f48918', high: g('--wf-high') || '#f6e5cd', bg: g('--wf-bg') || '#0c0d0f', ruler: g('--wf-ruler') || 'rgba(0,0,0,.35)', tick: g('--line-3') || '#474b53', down: g('--wf-down') || 'rgba(238,55,73,.68)', beat: g('--wf-beat') || 'rgba(169,171,176,.28)', play: g('--ok') || '#4cc38a', shade: g('--wf-shade') || 'rgba(0,0,0,.3)', wash: g('--wf-wash') || 'rgba(255,255,255,.06)', grid: g('--grid-rgb') || '255,255,255', text: g('--text-1') || '#eceae6', text2: g('--text-2') || '#a9abb0', dim: g('--text-3') || '#74777e', light: cv.closest('.light') != null };
  };
  function fit(cv) {
    const dpr = Math.min(6, (window.devicePixelRatio || 1) * (window.__uiScale || 1));
    const w = Math.max(1, Math.round(cv.offsetWidth * dpr)), h = Math.max(1, Math.round(cv.offsetHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { W: w, H: h, dpr };
  }
  // one column of layers, mirrored about yMid (or standing on yMid when `up`)
  function column(ctx, th, x, w, yMid, base, fr, up) {
    const cols = [th.low, th.mid, th.high];
    for (let i = 0; i < 3; i++) { const h = Math.round(base * fr[i]); if (h <= 0) continue; ctx.fillStyle = cols[i]; up ? ctx.fillRect(x, yMid - h, w, h) : ctx.fillRect(x, yMid - h, w, h * 2); }
  }
  // the cue's lettered tag, as the deck and the table draw it
  function cueTag(ctx, x, top, c, dpr, name) {
    ctx.font = `600 ${10.5 * dpr}px Geist, system-ui`; const label = name ? `${c.l} ${c.name}` : c.l;
    const w = ctx.measureText(label).width + 10 * dpr, h = (name ? 16 : 14) * dpr;
    ctx.fillStyle = c.c; ctx.beginPath(); name ? ctx.roundRect(x, top, w, h, [0, 3 * dpr, 3 * dpr, 0]) : ctx.roundRect(x - w / 2, top, w, h, 3 * dpr); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = name ? 'left' : 'center'; ctx.fillText(label, name ? x + 5 * dpr : x, top + h / 2 + .5 * dpr); ctx.textAlign = 'left';
    return h;
  }
  // overview of a whole track: one-sided, the window over the zoomed view, the rest dimmed
  function paintOverview(cv, d, o = {}) {
    const { W, H, dpr } = fit(cv); const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H);
    const th = cv.__th || (cv.__th = themeOf(cv));
    const cols = d.overview, n = cols.length, g = gainOf(d);
    const lane = o.tempo ? 16 * dpr : 0, bottom = H - lane - dpr;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H - lane);
    for (let x = 0; x < W; x += dpr) {
      const c = cols[Math.min(n - 1, Math.floor(x / W * n))]; if (!c) continue;
      const base = Math.min(1, energyOf(c[0] * g) * 1.65) * (bottom - 2 * dpr);
      column(ctx, th, x, dpr, bottom, base, layersOf(c), true);
    }
    if (o.tempo) {
      const f = d.downbeats, pts = [];
      for (let i = 0; i < f.length - 1; i++) pts.push([(f[i] + f[i + 1]) / 2, 240 / (f[i + 1] - f[i])]);
      const sm = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 3), i + 4); return [p[0], w.reduce((s, q) => s + q[1], 0) / w.length]; });
      const lo = Math.min(...sm.map(p => p[1])) - 1, hi = Math.max(...sm.map(p => p[1])) + 1;
      const y0 = H - 3 * dpr, hh = lane - 6 * dpr;
      ctx.beginPath(); sm.forEach(([t, b], i) => { const x = t / d.dur * W, y = y0 - (b - lo) / (hi - lo) * hh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = th.mid; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
    }
    const at = o.at ?? d.at;
    if (o.window) {
      const a = Math.max(0, (at - o.window / 2) / d.dur * W), b = Math.min(W, (at + o.window / 2) / d.dur * W);
      ctx.fillStyle = th.shade; ctx.fillRect(0, 0, a, H - lane); ctx.fillRect(b, 0, W - b, H - lane);
      ctx.fillStyle = th.wash; ctx.beginPath(); ctx.roundRect(a, dpr, b - a, H - lane - 2 * dpr, 2 * dpr); ctx.fill();
      ctx.strokeStyle = th.text; ctx.lineWidth = 1.25 * dpr; ctx.beginPath(); ctx.roundRect(a + .6 * dpr, 1.6 * dpr, b - a - 1.2 * dpr, H - lane - 3.2 * dpr, 2 * dpr); ctx.stroke();
    }
    if (o.cues) for (const c of o.cues) {
      const x = Math.round(c.t / d.dur * W); const h = cueTag(ctx, x, 0, c, dpr, false);
      ctx.fillStyle = c.c; ctx.fillRect(x - dpr / 2, h, dpr, H - lane - h);
    }
    if (o.playhead !== false) { const x = at / d.dur * W; ctx.fillStyle = th.play; ctx.fillRect(x - dpr, 0, 2 * dpr, H - lane); ctx.beginPath(); ctx.arc(x, 5 * dpr, 3.5 * dpr, 0, 7); ctx.fill(); }
  }
  /* zoomed waveform. `loopBars` makes a seamless loop out of whole bars of the real
     analysis, so a steady groove can play for as long as the page is open. */
  function zoomSampler(d, loopBars) {
    const cols = d.zoom; const t0 = d.at - d.window / 2, span = d.window, n = cols.length;
    const beat = 60 / d.bpm;
    const first = d.beats.find(b => b[1] === 1 && b[0] > t0 + 0.2);
    const L0 = first ? first[0] : t0 + 0.5, L = loopBars ? loopBars * 4 * beat : 0;
    const wrap = t => (L && (t < L0 || t >= L0 + L)) ? L0 + (((t - L0) % L) + L) % L : t;
    const at = t => { t = wrap(t); const i = Math.floor((t - t0) / span * n); return (i >= 0 && i < n) ? cols[i] : null; };
    return { at, L0, L, beat, wrap };
  }
  function paintZoom(cv, d, o) {
    const { W, H, dpr } = fit(cv); const ctx = cv.getContext('2d');
    const th = cv.__th || (cv.__th = themeOf(cv));
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    const ruler = 16 * dpr; const span = o.span || 6, center = o.t;
    const X = t => (t - (center - span / 2)) / span * W;
    const smp = o.sampler || zoomSampler(d, o.loopBars);
    // Each column is pinned to a fixed slice of time, so its shape never changes as it
    // scrolls, and the whole strip moves in whole device pixels: no shimmer.
    const step = dpr, n = Math.ceil(W / step) + 2, mid = Math.round(H / 2);
    const dt = span * step / W, k0 = Math.floor((center - span / 2) / dt);
    const x0 = Math.round(X(k0 * dt)), g = gainOf(d) * (o.gain ?? 1), half = mid - 3 * dpr;
    ctx.globalAlpha = o.alpha ?? 1;
    for (let i = 0; i < n; i++) { const c = smp.at((k0 + i + 0.5) * dt); if (!c) continue;
      column(ctx, th, x0 + i * step, step, mid, energyOf(c[0] * g) * half, layersOf(c), false); }
    ctx.globalAlpha = 1;
    // grid lines over the waveform, a hairline each: downbeats red, beats faint
    const lines = o.lines || [], hair = Math.max(1, Math.round(dpr));
    for (const L of lines) { const x = Math.round(X(L.t)); if (x < -4 || x > W + 4) continue;
      ctx.fillStyle = L.color || (L.down ? th.down : th.beat); ctx.fillRect(x, ruler, L.w ? L.w * dpr : hair, H - ruler); }
    // the bar ruler: a band across the top, bar numbers at the downbeats
    ctx.fillStyle = th.ruler; ctx.fillRect(0, 0, W, ruler);
    ctx.font = `400 ${10.5 * dpr}px Geist, system-ui`; ctx.textBaseline = 'middle';
    for (const L of lines) if (L.label != null) { const x = Math.round(X(L.t)); if (x < -30 || x > W) continue;
      ctx.fillStyle = th.tick; ctx.fillRect(x, 0, hair, ruler); ctx.fillStyle = th.dim; ctx.fillText(L.label, x + 4 * dpr, ruler / 2 + .5 * dpr); }
    if (o.cues) for (const c of o.cues) { const x = X(c.t); if (x < -120 || x > W) continue;
      cueTag(ctx, x, 0, c, dpr, true); ctx.fillStyle = c.c; ctx.fillRect(Math.round(x - .8 * dpr), ruler, Math.round(1.6 * dpr), H - ruler); }
    if (o.playhead !== false) { const x = Math.round(W / 2); ctx.fillStyle = th.play; ctx.fillRect(x - dpr, 0, 2 * dpr, H);
      ctx.beginPath(); ctx.arc(x, 5 * dpr, 3.5 * dpr, 0, 7); ctx.fill(); }
  }
  // beat lines for a steady track, extended beyond the analysed window by its tempo
  function steadyLines(d, from, to, o = {}) {
    const beat = 60 / d.bpm; const b0 = d.beats.find(b => b[1] === 1);
    const out = []; const k0 = Math.floor((from - b0[0]) / beat) - 1, k1 = Math.ceil((to - b0[0]) / beat) + 1;
    const barBase = o.barBase ?? 1;
    for (let k = k0; k <= k1; k++) {
      const t = b0[0] + k * beat, pos = ((k % 4) + 4) % 4; const down = pos === 0;
      out.push({ t, down, label: down ? String(barBase + Math.floor(k / 4)) : null });
    }
    return out;
  }
  // the deck's six readings, in its two columns (Solco ADR 0250)
  const charBars = d => [['Energy', d.energy], ['Drive', d.arousal], ['Peak', d.peak], ['Mood', d.valence], ['Dance', d.dance], ['Vocals', d.vocal]];
  const charBox = (d, k = 1) => `<div class="charbox">${charBars(d).map(([n, v]) => `<div class="cb"><span class="k">${n}</span><span class="bar"><i style="width:${v * k}%;background:${charColor(v)}"></i></span><span class="n">${Math.round(v * k)}</span></div>`).join('')}</div>`;
  // hot cues in the app's slot colours: A red, B blue, C green, D violet, E teal
  const CUES = [{ l: 'A', name: 'Intro', bar: 1, c: '#f03943' }, { l: 'B', name: 'Bass in', bar: 17, c: '#3c9bf4' }, { l: 'C', name: 'Vocal', bar: 49, c: '#5ccd8f' }, { l: 'D', name: 'Break', bar: 89, c: '#d88cff' }, { l: 'E', name: 'Outro', bar: 169, c: '#30c8b0' }];
  const cueTimes = d => CUES.map(c => ({ ...c, t: d.downbeats[c.bar - 1] })).filter(c => c.t != null);
  // a table row's waveform preview: one-sided, from its 96 stored columns
  const previewCols = w => { const b = Uint8Array.from(atob(w), c => c.charCodeAt(0)), r = []; for (let i = 0; i < b.length; i += 4) r.push([b[i] / 255, b[i + 1] / 255, b[i + 2] / 255, b[i + 3] / 255]); return r; };
  function paintPreview(cv, row, cues = []) {
    if (!row.w && !row._w) return;
    const { W, H, dpr } = fit(cv); const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H);
    const th = cv.__th || (cv.__th = themeOf(cv));
    const cols = row._w || (row._w = previewCols(row.w)), n = cols.length, g = gainOf({ lufs: row.lufs ?? -9 });
    const top = cues.length ? 10 * dpr : 2 * dpr, bottom = H;
    for (let x = 0; x < W; x += dpr) { const c = cols[Math.min(n - 1, Math.floor(x / W * n))];
      column(ctx, th, x, dpr, bottom, Math.min(1, energyOf(c[0] * g) * 1.65) * (bottom - top), layersOf(c), true); }
    cues.forEach((c, i) => { const x = Math.round(c.f * W); ctx.fillStyle = c.c; ctx.fillRect(x, 0, dpr, H);
      ctx.beginPath(); ctx.roundRect(x - 4 * dpr + 4.5 * dpr, 0, 10 * dpr, 10 * dpr, 2 * dpr); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `600 ${7.5 * dpr}px Geist, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.l, x + 5.5 * dpr, 5.5 * dpr); ctx.textAlign = 'left'; });
  }

  // a cursor that travels between points with a natural arc and presses
  const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.2-6.3 1.4 3.6 6.9-2.7 1.4-3.6-7L5 18.6z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  function cursorPos(path, t) {
    // path: [{t, x, y}], eased between keyframes
    if (t <= path[0].t) return path[0];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (t <= b.t) { const k = E.inOut(seg(t, a.t, b.t)); const arc = Math.sin(k * Math.PI) * (b.arc ?? -18);
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) + arc }; }
    }
    return path[path.length - 1];
  }

  window.UI = { S, I, esc, num, mmss, clamp, seg, lerp, E, keyColor, charColor, feelHtml, keyHtml, bpmf, paintOverview, paintZoom, zoomSampler, steadyLines, charBox, charBars, cueTimes, CUES, fit, paintPreview, CURSOR_SVG, cursorPos };
})();
