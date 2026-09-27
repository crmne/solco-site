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
  const keyColor = c => {
    if (!c) return '#555';
    const n = parseInt(c), minor = c.endsWith('A');
    return `hsl(${(n * 30 + 125) % 360} ${minor ? 42 : 50}% ${minor ? 60 : 68}%)`;
  };
  // character scale: blue, violet, orange
  const STOPS = [[53, 104, 240], [185, 163, 255], [240, 154, 76]];
  const charColor = v => {
    const k = clamp(v / 100) * 2, i = Math.min(1, Math.floor(k)), f = k - i;
    const a = STOPS[i], b = STOPS[i + 1];
    return `rgb(${a.map((x, j) => Math.round(lerp(x, b[j], f))).join(',')})`;
  };
  const FEELPOS = { Moody: [0, 0], Mellow: [1, 0], Warm: [2, 0], Brooding: [0, 1], Steady: [1, 1], Uplifting: [2, 1], Tense: [0, 2], Driving: [1, 2], Euphoric: [2, 2] };
  const feelHtml = f => { const p = FEELPOS[f] || [1, 1]; return f ? `<span class="feelg"><i style="--fx:${2 + p[0] * 3.5}px;--fy:${7 - p[1] * 3}px"></i>${f}</span>` : ''; };
  const keyHtml = k => k ? `<span class="key" style="color:${keyColor(k)}">${k}</span>` : '<span class="muted">–</span>';
  const bpmf = b => (Math.abs(b - Math.round(b)) < 0.05 ? String(Math.round(b)) : b.toFixed(1));

  /* ---------- waveform ---------- */
  const norm = arr => {
    const pct = i => { const v = arr.map(r => r[i]).sort((a, b) => a - b); return v[Math.floor(v.length * 0.99)] || 1; };
    const n = [pct(0), pct(1), pct(2), pct(3)];
    return arr.map(r => r.map((x, i) => Math.min(1, x / n[i])));
  };
  const cache = new Map();
  const normed = (d, key) => { const id = d.title + key; if (!cache.has(id)) cache.set(id, norm(d[key])); return cache.get(id); };
  // colours come from the interface theme the canvas sits in (graphite or paper)
  const themeOf = cv => {
    const cs = getComputedStyle(cv), g = k => cs.getPropertyValue(k).trim();
    return { low: g('--wf-low') || '#3568f0', mid: g('--wf-mid') || '#f09a4c', high: g('--wf-high') || '#f3eee4', bg: g('--wf-bg') || '#0f1012', ruler: g('--wf-ruler') || '#0e0f11', grid: g('--grid-rgb') || '255,255,255', text: g('--text-1') || '#eceae6', text2: g('--text-2') || '#a9abb0', light: cv.closest('.light') != null };
  };
  let TH = themeOf.bind(null);
  let CUR = { low: '#3568f0', mid: '#f09a4c', high: '#f3eee4' };
  function bands(ctx, colAt, n, x0, cw, yMid, hh, alpha = 1, gain = 1) {
    const WF = CUR;
    const layers = [[1, WF.low, 1.0], [2, WF.mid, 0.64], [3, WF.high, 0.30]];
    ctx.globalAlpha = alpha;
    for (const [bi, color, sc] of layers) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const c = colAt(i); if (!c) continue;
        const h = Math.max(0.6, Math.pow(c[bi], 1.1) * sc * hh * gain);
        ctx.rect(x0 + i * cw, yMid - h, cw + 0.35, h * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function fit(cv) {
    const dpr = Math.min(6, (window.devicePixelRatio || 1) * (window.__uiScale || 1));
    const w = Math.max(1, Math.round(cv.offsetWidth * dpr)), h = Math.max(1, Math.round(cv.offsetHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { W: w, H: h, dpr };
  }
  // overview of a whole track, with played part dimmed and an optional tempo strip
  function paintOverview(cv, d, o = {}) {
    const { W, H, dpr } = fit(cv); const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H);
    const th = cv.__th || (cv.__th = themeOf(cv)); CUR = th;
    const cols = normed(d, 'overview'); const n = cols.length, cw = W / n;
    const lane = o.tempo ? 16 * dpr : 0; const wfH = H - lane;
    const px = (o.at ?? d.at) / d.dur * W;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, px, H); ctx.clip();
    bands(ctx, i => cols[i], n, 0, cw, wfH / 2, wfH / 2 - 2, .38); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(px, 0, W - px, H); ctx.clip();
    bands(ctx, i => cols[i], n, 0, cw, wfH / 2, wfH / 2 - 2, 1); ctx.restore();
    if (o.tempo) {
      const f = d.downbeats, pts = [];
      for (let i = 0; i < f.length - 1; i++) pts.push([(f[i] + f[i + 1]) / 2, 240 / (f[i + 1] - f[i])]);
      const sm = pts.map((p, i) => { const w = pts.slice(Math.max(0, i - 3), i + 4); return [p[0], w.reduce((s, q) => s + q[1], 0) / w.length]; });
      const lo = Math.min(...sm.map(p => p[1])) - 1, hi = Math.max(...sm.map(p => p[1])) + 1;
      const y0 = H - 3 * dpr, hh = lane - 6 * dpr;
      ctx.beginPath(); sm.forEach(([t, b], i) => { const x = t / d.dur * W, y = y0 - (b - lo) / (hi - lo) * hh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = 'rgba(240,154,76,.9)'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
    }
    if (o.cues) for (const c of o.cues) {
      const x = c.t / d.dur * W; ctx.fillStyle = c.c; ctx.fillRect(x - dpr, 0, 2 * dpr, wfH);
      ctx.beginPath(); ctx.moveTo(x - 5 * dpr, 0); ctx.lineTo(x + 5 * dpr, 0); ctx.lineTo(x, 7 * dpr); ctx.closePath(); ctx.fill();
    }
    if (o.window) {
      const a = ((o.at ?? d.at) - o.window / 2) / d.dur * W, b = ((o.at ?? d.at) + o.window / 2) / d.dur * W;
      ctx.strokeStyle = `rgba(${th.grid},.55)`; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.roundRect(a, dpr, b - a, wfH - 2 * dpr, 3 * dpr); ctx.stroke();
    }
    ctx.fillStyle = th.text; ctx.fillRect(px - dpr, 0, 2 * dpr, H);
  }
  /* zoomed waveform. `loopBars` makes a seamless loop out of whole bars of the real
     analysis, so a steady groove can play for as long as the page is open. */
  function zoomSampler(d, loopBars) {
    const cols = normed(d, 'zoom'); const t0 = d.at - d.window / 2, span = d.window, n = cols.length;
    const beat = 60 / d.bpm;
    const first = d.beats.find(b => b[1] === 1 && b[0] > t0 + 0.2);
    const L0 = first ? first[0] : t0 + 0.5, L = loopBars ? loopBars * 4 * beat : 0;
    const wrap = t => (L && (t < L0 || t >= L0 + L)) ? L0 + (((t - L0) % L) + L) % L : t;
    const at = t => { t = wrap(t); const i = Math.floor((t - t0) / span * n); return (i >= 0 && i < n) ? cols[i] : null; };
    return { at, L0, L, beat, wrap };
  }
  function paintZoom(cv, d, o) {
    const { W, H, dpr } = fit(cv); const ctx = cv.getContext('2d');
    const th = cv.__th || (cv.__th = themeOf(cv)); CUR = th; const G = th.grid;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    const ruler = (o.ruler ?? 20) * dpr; const span = o.span || 6, center = o.t;
    const X = t => (t - (center - span / 2)) / span * W;
    const smp = o.sampler || zoomSampler(d, o.loopBars);
    // grid lines under the waveform
    const lines = o.lines || [];
    for (const L of lines) {
      const x = X(L.t); if (x < -4 || x > W + 4) continue;
      ctx.fillStyle = L.color || `rgba(${G},${L.a ?? (L.down ? .7 : .28)})`;
      ctx.fillRect(Math.round(x - (L.w || 1) * dpr / 2), ruler, (L.w || 1) * dpr, H - ruler);
    }
    const step = 2 * dpr, n = Math.ceil(W / step), mid = ruler + (H - ruler) / 2;
    bands(ctx, i => smp.at(center - span / 2 + (i * step) / W * span), n, 0, step, mid, (H - ruler) / 2 - 8 * dpr, o.alpha ?? 1, o.gain ?? 1);
    // lines again, faint, on top so the grid reads through loud passages
    for (const L of lines) { const x = X(L.t); if (x < -4 || x > W + 4) continue;
      ctx.fillStyle = L.color ? L.color : `rgba(${G},${(L.a ?? (L.down ? .7 : .28)) * .35})`; ctx.fillRect(Math.round(x - (L.w || 1) * dpr / 2), ruler, (L.w || 1) * dpr, H - ruler); }
    // ruler
    ctx.fillStyle = th.ruler; ctx.fillRect(0, 0, W, ruler); ctx.fillStyle = `rgba(${G},.08)`; ctx.fillRect(0, ruler - dpr, W, dpr);
    ctx.font = `500 ${11 * dpr}px Geist, system-ui`; ctx.textBaseline = 'middle';
    for (const L of lines) if (L.label != null) { const x = X(L.t); if (x < -30 || x > W) continue;
      ctx.fillStyle = `rgba(${G},${.5 * (L.la ?? 1)})`; ctx.fillRect(Math.round(x), ruler - 6 * dpr, dpr, 6 * dpr);
      ctx.fillStyle = th.text2; ctx.fillText(L.label, x + 5 * dpr, ruler / 2 + dpr); }
    if (o.cues) for (const c of o.cues) { const x = X(c.t); if (x < -80 || x > W) continue;
      ctx.fillStyle = c.c; ctx.fillRect(Math.round(x) - dpr, ruler, 2 * dpr, H - ruler);
      ctx.beginPath(); ctx.roundRect(x - dpr, ruler, 64 * dpr, 16 * dpr, [0, 3 * dpr, 3 * dpr, 0]); ctx.fill();
      ctx.fillStyle = '#15161a'; ctx.font = `600 ${10.5 * dpr}px Geist, system-ui`; ctx.fillText(c.l + '  ' + c.name, x + 5 * dpr, ruler + 8.5 * dpr); }
    if (o.playhead !== false) { const x = W / 2; ctx.fillStyle = th.text; ctx.fillRect(Math.round(x - dpr), ruler, 2 * dpr, H - ruler);
      ctx.beginPath(); ctx.moveTo(x - 6 * dpr, ruler); ctx.lineTo(x + 6 * dpr, ruler); ctx.lineTo(x, ruler + 7 * dpr); ctx.closePath(); ctx.fill(); }
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
  const charBars = d => [['Energy', d.energy], ['Mood', d.valence], ['Drive', d.arousal], ['Groove', d.dance], ['Peak', d.peak], ['Vocals', d.vocal]];
  const charBox = (d, k = 1) => `<div class="charbox">${charBars(d).map(([n, v]) => `<div class="cb"><span class="k">${n}</span><span class="bar"><i style="width:${v * k}%;background:${charColor(v)}"></i></span><span class="n">${Math.round(v * k)}</span></div>`).join('')}</div>`;
  const CUES = [{ l: 'A', name: 'Intro', bar: 1, c: '#4cc38a' }, { l: 'B', name: 'Bass in', bar: 17, c: '#7ea4ff' }, { l: 'C', name: 'Vocal', bar: 49, c: '#e8c14f' }, { l: 'D', name: 'Break', bar: 89, c: '#e59ad0' }, { l: 'E', name: 'Outro', bar: 169, c: '#4cc38a' }];
  const cueTimes = d => CUES.map(c => ({ ...c, t: d.downbeats[c.bar - 1] })).filter(c => c.t != null);

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

  window.UI = { S, I, esc, num, mmss, clamp, seg, lerp, E, keyColor, charColor, feelHtml, keyHtml, bpmf, paintOverview, paintZoom, zoomSampler, steadyLines, charBox, charBars, cueTimes, CUES, fit, bands, normed, CURSOR_SVG, cursorPos };
})();
