/* The seven chapters as live interface. Each demo builds its DOM once and then
   renders any moment t (seconds) deterministically: render(t) never depends on
   the previous frame, so the page can scrub and the film can seek. */
(function () {
  const { S, I, esc, num, mmss, clamp, seg, lerp, E, keyHtml, feelHtml, bpmf, charColor, charBars, paintOverview, paintZoom, zoomSampler, steadyLines, cueTimes, CURSOR_SVG, cursorPos } = window.UI;
  const $ = (r, s) => r.querySelector(s), $$ = (r, s) => [...r.querySelectorAll(s)];
  const setOp = (el, v) => { if (el) el.style.opacity = v; };
  const setT = (el, v) => { if (el) el.style.transform = v; };
  const txt = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const tween = (t, a, b, from, to, ease = E.out) => lerp(from, to, ease(seg(t, a, b)));

  // position of an element's center in the root's own (unscaled) coordinates
  function pos(root, el, dx = 0, dy = 0) {
    const r = root.getBoundingClientRect(), e = el.getBoundingClientRect(), k = r.width / root.offsetWidth || 1;
    return { x: (e.left - r.left) / k + e.width / k / 2 + dx, y: (e.top - r.top) / k + e.height / k / 2 + dy };
  }
  function cursorLayer(root) {
    const c = document.createElement('div'); c.className = 'cursor'; c.innerHTML = CURSOR_SVG; root.appendChild(c);
    const p = document.createElement('div'); p.className = 'press'; root.appendChild(p);
    return {
      // path of {t, el|x,y}; press times get a ring and the target gets pressed
      render(t, path, presses = []) {
        const pts = path.map(q => q.el ? { t: q.t, arc: q.arc, ...pos(root, q.el, q.dx || 0, q.dy || 0) } : q);
        const cp = cursorPos(pts, t);
        const vis = seg(t, pts[0].t - .25, pts[0].t) * (1 - seg(t, path.hide ?? 1e9, (path.hide ?? 1e9) + .3));
        let press = 0, ring = null;
        for (const pr of presses) { const k = t - pr.t; if (k > -0.12 && k < 0.18) press = Math.max(press, 1 - Math.abs(k - .03) / .15); if (k >= 0 && k < .6) ring = k / .6; }
        c.style.opacity = vis; c.style.transform = `translate(${cp.x - 4}px, ${cp.y - 3}px) scale(${1 - press * .12})`;
        if (ring != null) { const rr = 10 + ring * 26; p.style.opacity = (1 - ring) * .7 * vis; p.style.width = p.style.height = rr * 2 + 'px'; p.style.transform = `translate(${cp.x - rr}px, ${cp.y - rr}px)`; }
        else p.style.opacity = 0;
        return press;
      }
    };
  }
  const pressStyle = (el, k) => { if (el) { el.style.transform = `scale(${1 - k * .04})`; el.style.filter = k ? `brightness(${1 + k * .25})` : ''; } };

  /* ======================= HERO: the whole studio ======================= */
  function sidebar(o = {}) {
    const st = o.steps || {};
    const steps = [['Add music', '3 folders', 'done'], ['Analysis', '9,440', 'done'], ['Duplicates', '', 'done'], ['Tags', '779', 'next'], ['Beatgrids', '16', 'todo'], ['Playlists', '66', 'done'], ['Export', 'FRIDAY', 'todo']]
      .map(([l, c, s], i) => { const x = st[i] || {}; return { l, c: x.c ?? c, s: x.s ?? s, sel: x.sel }; });
    const tree = o.tree || [['folder', 'Genres', 4], ['folder', 'Floppy Disco', 21, true], ['pl', 'FD 01 · Doors Open', 143, 1], ['pl', 'FD 02 · Early Groove', 122, 1, true], ['pl', 'FD 03 · Floor Building', 98, 1], ['pl', 'FD 04 · Peak Disco', 76, 1], ['folder', 'Down the Rabbit Hole', 19], ['folder', 'Melodic House & Techno', 8], ['pl', 'Deep House', 988], ['pl', 'House', '2,296'], ['pl', 'Ambient', 623], ['pl', 'Techno', '1,551'], ['pl', 'Disco', 348], ['pl', 'Minimal', 324], ['pl', 'Warm-up', 830]];
    return `<aside class="side">
      <div class="side-top">${I('panel-left', 's18 muted')}<span class="name">Library</span><span class="iconbtn">${I('plus')}</span><span class="iconbtn">${I('settings')}</span></div>
      <div class="nav ${o.sel === 'all' ? 'sel' : ''}">${I('file-music')}<span class="lbl">All tracks</span><span class="cnt">9,440</span></div>
      <div class="nav ${o.sel === 'recent' ? 'sel' : ''}" data-k="recent">${I('clock-3')}<span class="lbl">Recently added</span><span class="cnt" data-k="recentc">${o.recent ?? 0}</span></div>
      <div class="nav">${I('alert-circle-filled')}<span class="lbl">Missing files</span><span class="cnt">6</span></div>
      <div class="sec"><span class="t">Prep</span><span class="aside" data-k="prepaside">${o.prepAside ?? '2 to do'}</span></div>
      ${steps.map((s, i) => `<div class="step ${s.s} ${s.sel ? 'sel' : ''}" data-step="${i}"><span class="dot">${s.s === 'done' ? I('check', 's14') : i + 1}</span><span class="lbl">${s.l}</span><span class="cnt tnum">${s.c}</span></div>`).join('')}
      <div class="sec"><span class="t">Playlists</span><span class="iconbtn" style="width:22px;height:22px">${I('sparkle', 's14')}</span><span class="iconbtn" style="width:22px;height:22px">${I('plus', 's14')}</span></div>
      ${tree.map(([k, n, c, x, y]) => k === 'folder'
        ? `<div class="nav" style="height:26px">${I(x ? 'chevron-down' : 'chevron-right', 's12 muted')}${I('folder', 's14')}<span class="lbl" style="color:var(--text-1)">${n}</span><span class="cnt">${c}</span></div>`
        : `<div class="nav ${y ? 'sel' : ''}" style="height:26px;${x ? 'padding-left:32px' : ''}">${I('list-sparkles', 's14')}<span class="lbl">${n}</span><span class="cnt">${c}</span></div>`).join('')}
      <div class="side-foot"><div class="activity"><span class="spin" data-k="spin"></span><span style="flex:1" data-k="act">${o.act || 'Working'}</span></div>
        <div class="activity">${I('usb-drive', 's14')}<span style="flex:1"><b style="font-weight:600;color:var(--text-1)">FRIDAY</b> · 38.37 GiB free</span>${I('eject', 's14 muted')}</div></div>
    </aside>`;
  }
  const libRow = (t, o = {}) => `<div class="row ${o.cls || ''}"><div class="c c-title">${esc(t.t)}</div><div class="c c-artist">${esc(t.a)}</div><div class="c c-style">${esc(t.s)}</div><div class="c c-bpm tnum">${bpmf(t.bpm)}</div><div class="c c-key">${keyHtml(t.k)}</div><div class="c c-time tnum">${mmss(t.d)}</div><div class="c c-energy"><span class="meter"><span class="bar"><i style="width:${t.e}%"></i></span><span class="tnum">${t.e}</span></span></div><div class="c c-feel">${feelHtml(t.f)}</div><div class="c c-num tnum">${t.p}</div><div class="c c-num tnum">${t.v}</div></div>`;
  const libHead = `<div class="ghead"><div class="c c-title">Title</div><div class="c c-artist">Artist</div><div class="c c-style">Style</div><div class="c c-bpm">BPM</div><div class="c c-key">Key</div><div class="c c-time">Time</div><div class="c c-energy">Energy</div><div class="c c-feel">Feel</div><div class="c c-num">Peak</div><div class="c c-num">Vocals</div></div>`;

  function deckHtml(d, o = {}) {
    return `<div class="deck">
      <div class="deck-head"><div class="art" style="background-image:url(${d.cover})"></div>
        <div class="tt"><div class="title">${esc(d.title)}</div><div class="meta">${esc(d.artist)}<span class="sep">·</span>${esc(d.album)}<span class="sep">·</span>${d.year}<span class="sep">·</span><span class="muted">${d.styles.slice(0, 2).join(', ')}</span></div></div>
        <div class="stats"><div class="stat"><div class="v tnum">${d.bpm.toFixed(2)}</div><div class="k">BPM</div></div>
          <div class="stat"><div class="v" style="color:${window.UI.keyColor(d.camelot)}">${d.camelot}<small>${d.keyname}</small></div><div class="k">Key</div></div>
          <div class="stat"><div class="v tnum" data-k="remain">−0:00<small>of ${mmss(d.dur)}</small></div><div class="k">Remaining</div></div>
          <div class="stat"><div class="v tnum">${d.lufs.toFixed(1)}<small>LUFS</small></div><div class="k">Loudness</div></div></div></div>
      <div class="deck-mid"><div class="ov"><canvas data-k="ov"></canvas></div>${window.UI.charBox(d)}</div>
      <div class="zoom" style="${o.zoomH ? 'height:' + o.zoomH + 'px' : ''}"><canvas data-k="zoom"></canvas></div>
      <div class="tools"><span class="play" data-k="play">${I('pause-filled', 'fill s18')}</span><span style="width:6px"></span>
        ${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l, i) => { const c = window.UI.CUES[i]; return `<span class="pad ${c ? 'set' : ''}" style="${c ? 'background:' + c.c : ''}">${l}</span>`; }).join('')}
        <span class="tsep"></span><span class="seg">${I('repeat', 's14 muted')}<span>½</span><span>1</span><span>2</span><span class="on">4</span><span>8</span><span>16</span></span>
        <span style="flex:1"></span><span class="btn">${I('metronome', 's14')}Click</span><span class="btn">${I('flag', 's14')}Downbeat</span>
        <span class="btn tnum" style="min-width:104px">${d.bpm.toFixed(2)} <span class="muted" style="font-size:11px">BPM</span></span><span class="btn sq">${I('check', 's14')}</span></div>
    </div>`;
  }

  function hero(root) {
    const d = S.deck; const W = 1280, H = 800;
    root.style.width = W + 'px'; root.style.height = H + 'px';
    const rows = S.lib.slice(0, 22); rows.splice(3, 0, { t: d.title, a: d.artist, s: 'Disco', bpm: d.bpm, k: d.camelot, d: Math.round(d.dur), e: Math.round(d.energy), f: d.feel, p: Math.round(d.peak), v: Math.round(d.vocal), playing: true });
    root.innerHTML = sidebar() + `<div class="main">${deckHtml(d)}
      <div class="lib-head"><span class="ttl">FD 02 · Early Groove</span><span class="sub">122 tracks · 13 h 21 m</span>
        <div class="search">${I('search', 's14')}<span class="chip">BPM <b>110–122</b></span><span class="chip">Energy <b>60–64</b></span><span class="chip">Groove <b>≥ 80</b></span></div><span class="iconbtn">${I('columns-3')}</span></div>
      ${libHead}<div class="rows">${rows.map((t, i) => libRow(t, { cls: t.playing ? 'playing sel' : '' })).join('')}</div></div>`;
    const ov = $(root, '[data-k=ov]'), zc = $(root, '[data-k=zoom]'), rem = $(root, '[data-k=remain]');
    const smp = zoomSampler(d, 4); const cues = cueTimes(d);
    const tagsCnt = $(root, '[data-step="3"] .cnt');
    const spin = $(root, '[data-k=spin]'), act = $(root, '[data-k=act]'), recentc = $(root, '[data-k=recentc]');
    // new downloads file themselves into the smart playlists they fit
    const FILE = { 'Deep House': 3, 'House': 4, 'Disco': 3, 'Techno': 2, 'FD 02 · Early Groove': 2, 'Warm-up': 1 };
    const fileEls = $$(root, '.side .nav').map(n => { const l = $(n, '.lbl'), c = $(n, '.cnt'); const add = l && FILE[l.textContent]; if (!add) return null;
      const base = parseInt(c.textContent.replace(/,/g, '')); return { n, c, base, add }; }).filter(Boolean);
    const T1 = 1.0, T2 = 3.4;
    return {
      dur: 1e9, still: 4.2,
      render(t) {
        const at = smp.L0 + 1.2 + t;
        const lines = steadyLines(d, at - 5, at + 5, { barBase: 89 }).map(L => ({ ...L, t: L.t }));
        // bar labels follow the real downbeats of the loop
        paintZoom(zc, d, { t: at, span: 7, sampler: smp, lines: lines.map(L => ({ ...L, label: L.down ? String(89 + Math.round((L.t - smp.L0) / (4 * smp.beat))) : null })) });
        paintOverview(ov, d, { at: smp.L0 + 1.2 + (t % 400), cues, window: 7 });
        txt(rem, `−${mmss(d.dur - (smp.L0 + 1.2 + t))}`); rem.insertAdjacentHTML; // keep small label
        if (!rem.querySelector('small')) rem.insertAdjacentHTML('beforeend', `<small>of ${mmss(d.dur)}</small>`);
        // the Tags step settles 214 confident matches shortly after the page opens
        txt(tagsCnt, num(tween(t, T1 + .6, T2 + .4, 779, 565, E.inOut)));
        const k = seg(t, T1, T2);
        txt(recentc, String(Math.round(E.inOut(k) * 12)));
        txt(act, t < T1 ? 'Watching 3 folders' : k < 1 ? `Filing ${Math.round(E.inOut(k) * 12)} of 12 new tracks` : '12 new tracks filed');
        fileEls.forEach((f, i) => { const kk = E.out(seg(t, T1 + .3 + i * .28, T1 + .8 + i * .28)); txt(f.c, num(f.base + Math.round(kk * f.add)));
          const glow = kk > 0 && kk < 1 ? 1 : Math.max(0, 1 - (t - (T1 + .8 + i * .28)) / .9) * (kk >= 1 ? 1 : 0);
          f.c.style.color = glow > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(glow * 100)}%, var(--text-3))` : ''; });
        spin.style.transform = `rotate(${t * 360}deg)`;
        spin.style.opacity = k > 0 && k < 1 ? 1 : .35;
      }
    };
  }

  /* ======================= 1 · ADD MUSIC ======================= */
  function addMusic(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 560; root.style.width = W + 'px'; root.style.height = H + 'px';
    const files = ['Neşe Karaböcek - Yali Yali (Todd Terje Edit).mp3', '02. Rare Pleasure - Let Me Down Easy (Disco Version).flac', '06. Inland Knights - Clean Doubt.flac', '10. Inland Knights - Talk About Soul.flac', '11. Inland Knights - Think About It.flac', '08. Inland Knights - Wait A Minute.flac'];
    const lens = ['5:56', '4:43', '3:36', '2:56', '4:45', '2:01'];
    const bg = S.recent.slice(0, 16);
    root.innerHTML = `<div class="bgwin" style="position:absolute;inset:0;display:flex">${o.cmp ? '' : sidebar({ sel: 'recent', recent: 0, act: 'Idle' })}
      <div class="main"><div class="lib-head"><span class="ttl">Recently added</span><span class="sub" data-k="sub">Nothing new yet</span></div>
      <div class="ghead"><div class="c" style="width:34px"></div><div class="c c-title">Title</div><div class="c c-artist">Artist</div><div class="c" style="width:120px">Status</div></div>
      <div class="rows">${bg.map(t => `<div class="row" data-r><div class="c" style="width:34px;padding-left:14px"><span class="spin" style="width:12px;height:12px;border-color:var(--line-2);border-top-color:var(--line-2)"></span></div><div class="c c-title">${esc(t.t)}</div><div class="c c-artist">${esc(t.a)}</div><div class="c muted" style="width:120px">Waiting</div></div>`).join('')}</div></div></div>
      <div data-k="scrim" style="position:absolute;inset:0;background:rgba(8,9,11,.72)"></div>
      <div data-k="drag" style="position:absolute;left:0;top:0;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:var(--bg-3);border:1px solid var(--line-3);box-shadow:0 18px 50px rgba(0,0,0,.5);font-weight:550">${I('file-music', 's14 accent')} 38 files</div>
      <div class="card" data-k="dlg" style="position:absolute;left:${(W - (o.cmp ? 520 : 600)) / 2}px;top:52px;width:${o.cmp ? 520 : 600}px;background:var(--bg-2);border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden">
        <div style="padding:22px 24px 0"><div class="ttl-f" style="font-size:25px;line-height:30px">Add 38 tracks to your library</div>
          <div class="dim" style="margin-top:6px">From <span class="mono" style="color:var(--text-1)">~/Downloads/Bandcamp</span> · 1.9 GB · 16 FLAC, 22 other. These files are outside your music folders.</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 24px 0">
          <div data-k="opt1" style="border:1px solid var(--accent-line);background:var(--accent-soft);border-radius:10px;padding:12px 14px;box-shadow:inset 0 0 0 1px var(--accent-line)"><div style="display:flex;gap:10px;align-items:center;font-weight:600"><span class="radio on"></span>${I('copy', 's14')}Copy into Music</div><div class="dim" style="margin:4px 0 0 26px;font-size:12.5px">Originals stay in Downloads.</div></div>
          <div style="border:1px solid var(--line-2);border-radius:10px;padding:12px 14px"><div style="display:flex;gap:10px;align-items:center;font-weight:600"><span class="radio"></span>${I('arrow-right', 's14')}Move into Music</div><div class="dim" style="margin:4px 0 0 26px;font-size:12.5px">Files leave Downloads.</div></div></div>
        <div style="padding:12px 24px 0;display:flex;gap:8px;align-items:center;font-size:12.5px"><span class="muted">Into</span><span class="mono">~/Music/</span><span class="muted">Artist / Album / Track</span></div>
        <div style="margin:10px 24px 0;border:1px solid var(--line-1);border-radius:10px;background:var(--bg-1);padding:6px 0">
          ${files.map((f, i) => `<div data-f style="height:24px;display:flex;align-items:center;gap:10px;padding:0 12px;font-size:12.5px">${I('audio-waveform', 's14 muted')}<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f)}</span><span class="muted tnum">${lens[i]}</span></div>`).join('')}
          <div data-f style="height:24px;display:flex;align-items:center;padding:0 12px 0 36px;font-size:12.5px" class="muted">and 32 more</div></div>
        <div style="display:flex;gap:8px;align-items:center;padding:16px 20px 18px 24px;margin-top:16px;border-top:1px solid var(--line-1)"><span class="muted" style="font-size:12px;flex:1">Analysis starts as soon as the files are in.</span><span class="btn lg">Cancel</span><span class="btn lg primary" data-k="go">Copy 38 tracks</span></div>
      </div>`;
    const dlg = $(root, '[data-k=dlg]'), scrim = $(root, '[data-k=scrim]'), drag = $(root, '[data-k=drag]'), go = $(root, '[data-k=go]');
    const frows = $$(root, '[data-f]'), brows = $$(root, '[data-r]'), sub = $(root, '[data-k=sub]'), rc = $(root, '[data-k=recentc]');
    const cur = cursorLayer(root);
    return {
      dur: 4.8, still: 1.45,
      render(t) {
        // a stack of files is dragged in from the edge and dropped
        const dk = E.inOut(seg(t, 0, .7));
        setT(drag, `translate(${lerp(-120, W / 2 - 60, dk)}px, ${lerp(80, 250, dk) - Math.sin(dk * Math.PI) * 40}px) scale(${1 - seg(t, .7, .85) * .2})`);
        setOp(drag, seg(t, 0, .1) * (1 - seg(t, .7, .85)));
        const din = E.out5(seg(t, .75, 1.2)), dout = E.in(seg(t, 2.75, 3.05));
        setOp(dlg, din * (1 - dout)); setT(dlg, `translateY(${(1 - din) * 16 + dout * 10}px) scale(${.97 + din * .03 - dout * .02})`);
        setOp(scrim, seg(t, .7, 1.1) * (1 - seg(t, 2.8, 3.2)) * .9 + .1 * (1 - seg(t, 2.8, 3.2)) + seg(t, 2.8, 3.2) * 0);
        frows.forEach((r, i) => { const k = E.out(seg(t, .95 + i * .09, 1.35 + i * .09)); setOp(r, k); setT(r, `translateX(${(1 - k) * 10}px)`); });
        const pr = cur.render(t, Object.assign([{ t: 1.75, x: W * .62, y: 470 }, { t: 2.45, el: go, dx: -18, dy: 4 }], { hide: 2.9 }), [{ t: 2.55 }]);
        pressStyle(go, pr);
        brows.forEach((r, i) => { const k = E.out(seg(t, 3.05 + i * .04, 3.45 + i * .04)); setOp(r, k); setT(r, `translateY(${(1 - k) * 8}px)`); });
        const n = Math.round(tween(t, 3.05, 3.8, 0, 38, E.inOut));
        txt(sub, n ? `${n} new · analysis starts now` : 'Nothing new yet'); if (rc) txt(rc, n ? `${n} new` : '0');
      }
    };
  }

  /* ======================= 2 · ANALYSIS ======================= */
  function analysis(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 580; root.style.width = W + 'px'; root.style.height = H + 'px';
    const d = S.deck;
    const rows = [{ t: d.title, a: d.artist, s: 'Disco', bpm: d.bpm, k: d.camelot, d: Math.round(d.dur), e: Math.round(d.energy), f: d.feel }, ...S.recent.slice(1, 14)];
    const STAGES = ['Fingerprint', 'Loudness', 'Key', 'Beatgrid', 'Character'];
    const start = i => .25 + Math.floor(i / 4) * 1.55 + (i % 4) * .22, LEN = 1.45;
    root.innerHTML = `<div class="deck" style="padding-bottom:14px"><div class="deck-head" style="height:84px">
        <div class="art" data-k="art" style="background-image:url(${d.cover})"></div>
        <div class="tt"><div class="title" style="font-size:24px">${esc(d.title)}</div><div class="meta">${esc(d.artist)}<span class="sep">·</span>${esc(d.album)}<span class="sep">·</span>${d.year}</div></div>
        <div class="stats ${o.cmp ? 'hide' : ''}" style="${o.cmp ? 'display:none' : ''}"><div class="stat"><div class="v tnum" data-k="bpm">–</div><div class="k">BPM</div></div>
          <div class="stat"><div class="v" data-k="key" style="color:${window.UI.keyColor(d.camelot)}">–</div><div class="k">Key</div></div>
          <div class="stat"><div class="v tnum" data-k="lufs">–</div><div class="k">Loudness</div></div></div></div>
      <div style="display:flex;gap:18px;padding:10px 20px 0;align-items:center">
        <div style="flex:1;display:flex;gap:6px;align-items:center;flex-wrap:wrap" data-k="styles"><span class="lbl11" style="margin-right:6px">Style</span>${(d.styles || []).slice(0, 3).map((s, i) => `<span class="chip" data-st><b>${s}</b><span class="tnum">${[39, 16, 14][i]}</span></span>`).join('')}</div>
        <div style="width:${o.cmp ? 250 : 320}px;flex:none"><div class="charbox" style="width:100%;margin:0;border:0;padding:0">${charBars(d).map(([n]) => `<div class="cb"><span class="k">${n}</span><span class="bar"><i data-cb></i></span><span class="n" data-cn>0</span></div>`).join('')}</div></div></div></div>
      <div class="lib-head" style="height:48px"><span class="ttl" style="font-size:20px">Recently added</span><span class="sub" data-k="sub">38 new · analysing</span></div>
      <div class="ghead"><div class="c" style="width:34px"></div><div class="c c-title">Title</div>${o.cmp ? '' : '<div class="c c-artist">Artist</div>'}<div class="c c-style">Style</div><div class="c c-bpm">BPM</div><div class="c c-key">Key</div>${o.cmp ? '' : '<div class="c c-energy">Energy</div><div class="c c-feel">Feel</div>'}</div>
      <div class="rows">${rows.map((t, i) => `<div class="row" data-r>
        <div class="c" style="width:34px;padding-left:12px" data-st></div><div class="c c-title">${esc(t.t)}</div>${o.cmp ? '' : `<div class="c c-artist">${esc(t.a)}</div>`}
        <div data-prog style="position:absolute;left:${o.cmp ? 230 : 434}px;display:flex;align-items:center;gap:8px"><span style="display:flex;gap:3px">${STAGES.map(() => '<i style="width:14px;height:3px;border-radius:2px;background:var(--bg-4);display:block"></i>').join('')}</span><span class="muted" data-lab style="font-size:12px">Waiting</span></div>
        <div class="c c-style" data-v>${esc(t.s)}</div><div class="c c-bpm tnum" data-v>${bpmf(t.bpm)}</div><div class="c c-key" data-v>${keyHtml(t.k)}</div>
        ${o.cmp ? '' : `<div class="c c-energy" data-v><span class="meter"><span class="bar"><i style="width:${t.e}%"></i></span><span class="tnum">${t.e}</span></span></div><div class="c c-feel" data-v>${feelHtml(t.f)}</div>`}</div>`).join('')}</div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:34px;border-top:1px solid var(--line-1);background:var(--bg-1);display:flex;align-items:center;gap:10px;padding:0 20px;font-size:12.5px;color:var(--text-2)"><span class="spin" data-k="spin"></span><span data-k="act">Analysis · 0 of 38</span><span style="flex:1"></span><span class="muted">${I('hard-drive', 's14')}</span><span class="muted">On this computer · GPU</span></div>`;
    const R = $$(root, '[data-r]').map(r => ({ st: $(r, '[data-st]'), prog: $(r, '[data-prog]'), dash: $$(r, '[data-prog] i'), lab: $(r, '[data-lab]'), v: $$(r, '[data-v]') }));
    // The progress sits where the not-yet-analysed columns will appear, right after the artist (or the title).
    const placeProg = () => R.forEach(r => { const st = r.v[0]; if (st && st.offsetWidth) r.prog.style.left = (st.offsetLeft + 8) + 'px'; });
    placeProg(); requestAnimationFrame(placeProg);
    const cbs = $$(root, '[data-cb]'), cns = $$(root, '[data-cn]'), vals = charBars(d).map(x => x[1]);
    const bpm = $(root, '[data-k=bpm]'), key = $(root, '[data-k=key]'), lufs = $(root, '[data-k=lufs]'), act = $(root, '[data-k=act]'), spin = $(root, '[data-k=spin]'), sts = $$(root, '[data-k=styles] [data-st]');
    return {
      dur: 7.4, still: 7.3,
      render(t) {
        let done = 0;
        R.forEach((r, i) => {
          const s = start(i), k = seg(t, s, s + LEN), fin = t >= s + LEN;
          if (fin) done++;
          const stage = Math.min(4, Math.floor(k * 5));
          r.dash.forEach((dsh, j) => { dsh.style.background = k === 0 ? 'var(--bg-4)' : j < stage || fin ? 'var(--text-3)' : j === stage ? 'var(--accent)' : 'var(--bg-4)'; });
          txt(r.lab, k === 0 ? 'Waiting' : STAGES[stage]);
          const vk = E.out(seg(t, s + LEN, s + LEN + .35));
          setOp(r.prog, 1 - vk); r.v.forEach((v, j) => { setOp(v, E.out(seg(t, s + LEN + j * .04, s + LEN + .35 + j * .04))); });
          r.st.innerHTML = fin ? `<span style="color:var(--ok);display:flex;opacity:${vk}">${I('check', 's14')}</span>` : k > 0 ? `<span class="spin" style="width:12px;height:12px;transform:rotate(${t * 400}deg)"></span>` : '<span style="width:5px;height:5px;border-radius:3px;background:var(--text-4);display:block;margin-left:4px"></span>';
        });
        // the first track's full reading lands in the header
        const f = start(0) + LEN;
        const kk = E.out(seg(t, f, f + .9));
        txt(bpm, t < f ? '–' : lerp(90, d.bpm, E.out5(seg(t, f, f + .6))).toFixed(2));
        txt(key, t < f + .15 ? '–' : d.camelot); if (t >= f + .15 && !key.querySelector('small')) key.insertAdjacentHTML('beforeend', `<small>${d.keyname}</small>`); if (t < f + .15) key.innerHTML = '–';
        lufs.innerHTML = t < f + .3 ? '–' : `${lerp(-30, d.lufs, E.out5(seg(t, f + .3, f + .9))).toFixed(1)}<small>LUFS</small>`;
        cbs.forEach((b, j) => { const kj = E.out(seg(t, f + .2 + j * .08, f + 1.1 + j * .08)); b.style.width = vals[j] * kj + '%'; b.style.background = charColor(vals[j] * kj); txt(cns[j], String(Math.round(vals[j] * kj))); });
        sts.forEach((s, j) => { const kj = E.out(seg(t, f + .5 + j * .12, f + .9 + j * .12)); setOp(s, kj); setT(s, `translateY(${(1 - kj) * 6}px)`); });
        txt(act, done >= R.length ? `Analysis · ${R.length} of 38 · continuing` : `Analysis · ${done} of 38`);
        spin.style.transform = `rotate(${t * 360}deg)`;
      }
    };
  }

  /* ======================= 3 · DUPLICATES ======================= */
  function duplicates(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 540; root.style.width = W + 'px'; root.style.height = H + 'px';
    const G = [
      { t: 'Whistle Me (Fouk remix)', a: 'Elisa Elisa', ev: 'same recording on two releases · fingerprint 100%', keep: ['Music', 'Compilations/The Round Up Pt. 11/01 Whistle Me (Fouk remix).m4a', 'AAC 256', '5:21', '10.7 MB', 'in 1 playlist'], rm: [['Downloads', 'Beatport/Elisa Elisa - Whistle Me (Fouk Remix).mp3', 'MP3 320', '5:21', '12.2 MB'], ['Downloads', 'Bandcamp/Elisa Elisa - Whistle Me (Fouk remix).mp3', 'MP3 320', '5:21', '12.0 MB']] },
      { t: 'Freak n Freeze', a: 'Bill Deal', ev: 'same recording · fingerprint 98%', keep: ['Music', 'Compilations/Selectors 001 - Motor City Drum Ensemble/08 Freak n Freeze.m4a', 'AAC 256', '4:08', '8.4 MB', 'in 2 playlists'], rm: [['Downloads', 'Selectors 001 - Motor City Drum Ensemble/03 Freak n Freeze.mp3', 'MP3 320', '4:09', '9.5 MB']] },
      { t: "Don't Mess With The Devil", a: 'Raphael Green', ev: 'same recording · fingerprint 100%', keep: ['Music', "Compilations/Selectors 001 - Motor City Drum Ensemble/06 Don't Mess With The Devil.m4a", 'AAC 256', '4:13', '9.2 MB', 'in 1 playlist · 3 cues'], rm: [['Downloads', "Selectors 001 - Motor City Drum Ensemble/05 Don't Mess With The Devil.mp3", 'MP3 320', '4:13', '9.7 MB'], ['Downloads', "Bandcamp/Raphael Green - Don't Mess With The Devil.mp3", 'MP3 320', '4:13', '9.5 MB']] },
    ];
    const cp = (c, keep) => `<div class="copy ${keep ? '' : 'rm'}" ${keep ? 'data-keep' : 'data-rm'}><span class="radio ${keep ? 'on' : ''}"></span><span class="tagk ${keep ? 'keep' : 'rm'}">${keep ? 'KEEP' : 'REMOVE'}</span><span class="p"><b>${c[0]}</b>/${esc(c[1])}</span>${o.cmp ? '' : `<span class="m">${c[2]}</span><span class="m tnum" style="width:38px;text-align:right">${c[3]}</span><span class="m tnum" style="width:60px;text-align:right">${c[4]}</span>`}<span class="m" style="width:${o.cmp ? 110 : 150}px" ${keep ? 'data-inpl' : ''}>${keep ? c[5] : 'outside your library'}</span></div>`;
    root.innerHTML = `<div class="vhead"><div class="ttl">Duplicates</div><div class="sub tnum" data-k="sub">3 recordings in more than one place · 5 extra copies · 53 MB</div><span style="flex:1"></span>${o.cmp ? '' : `<span class="btn ghost">${I('check', 's14')}Keep all as they are</span>`}<span class="btn danger-o" data-k="rmall">${I('trash-2', 's14')}Remove 5 copies…</span></div>
      <div style="margin:0 20px 6px 24px;padding:10px 14px;border-radius:8px;background:var(--bg-2);border:1px solid var(--line-1);color:var(--text-2);display:flex;gap:10px;align-items:center;font-size:12.5px">${I('info', 's14')}<span>Solco keeps the copy in your music folder. Playlists, cues and grid edits move to the kept copy.</span></div>
      ${G.map(g => `<div style="padding:10px 20px 8px 24px;border-bottom:1px solid var(--line-1)" data-g><div style="height:26px;display:flex;align-items:center;gap:10px"><span style="font-weight:600">${esc(g.t)}</span><span class="dim">${esc(g.a)}</span><span class="muted" style="font-size:12px">· ${g.ev}</span></div>${cp(g.keep, 1)}${g.rm.map(r => cp(r, 0)).join('')}</div>`).join('')}
      <div data-k="sum" style="position:absolute;left:24px;right:20px;bottom:22px;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:10px;background:rgba(76,195,138,.07);border:1px solid rgba(76,195,138,.3)"><span class="ok">${I('circle-check', 's20')}</span><div style="flex:1;min-width:0"><div style="font-weight:600">5 copies moved to the trash</div><div class="dim" style="font-size:12.5px">One copy of each recording stays in Music, with its playlists and cues.</div></div><span class="btn">Undo</span></div>
      <div data-k="scrim" style="position:absolute;inset:0;background:rgba(8,9,11,.7)"></div>
      <div class="card" data-k="dlg" style="position:absolute;left:${(W - (o.cmp ? 520 : 560)) / 2}px;top:90px;width:${o.cmp ? 520 : 560}px;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden">
        <div style="padding:20px 22px 4px"><div class="ttl-f" style="font-size:22px">Move 5 copies to the trash?</div><div class="dim" style="margin-top:6px">These files leave your library. You can restore them from the trash.</div></div>
        <div style="margin:12px 22px 0;border:1px solid var(--line-1);border-radius:8px;background:var(--bg-1);padding:6px 0">${G.flatMap(g => g.rm).map(r => `<div style="height:24px;display:flex;align-items:center;gap:8px;padding:0 12px" class="mono"><span class="danger">${I('trash-2', 's12')}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-2)"><b style="font-weight:500;color:var(--text-1)">${r[0]}</b>/${esc(r[1])}</span></div>`).join('')}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:16px 20px 18px;margin-top:14px;border-top:1px solid var(--line-1)"><span class="btn lg">Cancel</span><span class="btn lg" data-k="confirm" style="background:var(--danger);border-color:var(--danger);color:#240608;font-weight:600">Move 5 to trash</span></div></div>`;
    const rms = $$(root, '[data-rm]'), keeps = $$(root, '[data-keep]'), inpl = $$(root, '[data-inpl]');
    const dlg = $(root, '[data-k=dlg]'), scrim = $(root, '[data-k=scrim]'), rmall = $(root, '[data-k=rmall]'), confirm = $(root, '[data-k=confirm]'), sub = $(root, '[data-k=sub]'), sum = $(root, '[data-k=sum]');
    const cur = cursorLayer(root);
    return {
      dur: 5.6, still: 2.5,
      render(t) {
        const gs = $$(root, '[data-g]'); gs.forEach((g, i) => { const k = E.out(seg(t, .05 + i * .12, .5 + i * .12)); setOp(g, k); setT(g, `translateY(${(1 - k) * 10}px)`); });
        const din = E.out5(seg(t, 1.75, 2.1)), dout = E.in(seg(t, 3.2, 3.45));
        setOp(dlg, din * (1 - dout)); setT(dlg, `translateY(${(1 - din) * 14}px) scale(${.97 + din * .03})`); setOp(scrim, din * (1 - dout));
        const pr = cur.render(t, Object.assign([{ t: .9, x: W * .55, y: 300 }, { t: 1.5, el: rmall, dx: -20 }, { t: 2.45, el: rmall, dx: -20 }, { t: 3.0, el: confirm, dx: -10, arc: -30 }], { hide: 3.4 }), [{ t: 1.6 }, { t: 3.1 }]);
        pressStyle(rmall, t < 2 ? pr : 0); pressStyle(confirm, t > 2.6 ? pr : 0);
        rms.forEach((r, i) => { const k = E.inOut(seg(t, 3.5 + i * .12, 3.95 + i * .12)); r.style.height = (30 * (1 - k)) + 'px'; setOp(r, 1 - E.out(seg(t, 3.5 + i * .12, 3.75 + i * .12))); });
        keeps.forEach((kp, i) => { const k = seg(t, 4.1 + i * .12, 4.6 + i * .12); const tag = $(kp, '.tagk'); txt(tag, k > 0 ? 'KEPT' : 'KEEP'); tag.style.boxShadow = k > 0 && k < 1 ? `0 0 0 ${3 * (1 - k)}px rgba(76,195,138,${.4 * (1 - k)})` : ''; });
        inpl.forEach((x, i) => { x.style.color = t > 4.1 + i * .12 ? 'var(--text-2)' : ''; });
        txt(sub, t < 4.3 ? '3 recordings in more than one place · 5 extra copies · 53 MB' : 'Settled · 5 copies moved to the trash · playlists and cues kept');
        setOp(rmall, 1 - seg(t, 4.0, 4.4) * .6);
        const sk = E.out5(seg(t, 4.5, 4.95)); setOp(sum, sk); setT(sum, `translateY(${(1 - sk) * 14}px)`);
      }
    };
  }

  /* ======================= 4 · TAGS ======================= */
  const FIELDS = [['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['year', 'Year']];
  function tags(root, o = {}) {
    const W = o.cmp ? 560 : 1100, H = 620; root.style.width = W + 'px'; root.style.height = H + 'px';
    const changes = x => { const f = FIELDS.filter(([k]) => x.p[k] != null && String(x.p[k]) !== String(x.o[k] ?? '')).map(y => y[1]); if (x.c) f.push('Artwork'); return f.join(', '); };
    const ready = S.tags.slice(1, 16);
    const sel = S.tags[0];
    const fld = [['Title', sel.o.title, 'At Midnight', 1], ['Artist', sel.o.artist, 'T‐Connection', 1], ['Album', '', sel.p.album, 1], ['Year', '', '1994', 1], ['Track', '', 'Disc 1 · Track 6', 1], ['Comment', sel.o.comment, '', 1]];
    const PW = 430;
    root.innerHTML = `<div style="display:flex;height:100%"><section style="flex:1;min-width:0;display:flex;flex-direction:column;position:relative">
        <div class="vhead"><div class="ttl">Tags</div><div class="sub tnum">812 of 1,378 looked up</div><span style="flex:1"></span>${o.cmp ? '' : `<span class="btn">${I('search', 's14')}Find tags ${I('chevron-down', 's12 muted')}</span>`}
          <span class="btn primary" data-k="apply" style="min-width:176px">${I('check', 's14')}<span data-k="applyl">Apply 214 confident</span></span></div>
        <div style="padding:0 20px 12px 24px"><span class="seg big"><span>To check <span class="muted tnum">566</span></span><span class="on" data-k="readyt">Ready <span class="muted tnum" data-k="readyc">214</span></span>${o.cmp ? '' : '<span>No match <span class="muted tnum">120</span></span>'}<span>Tagged <span class="muted tnum" data-k="taggedc">478</span></span></span></div>
        <div class="ghead"><div class="c" style="width:34px"></div><div class="c c-title">Title</div>${o.cmp ? '' : '<div class="c" style="width:150px">Artist</div>'}<div class="c" style="width:${o.cmp ? 150 : 170}px">Would change</div><div class="c r" style="width:58px">Match</div></div>
        <div class="rows">${ready.map(x => `<div class="row" data-r style="height:28px"><div class="c" style="width:34px;padding-left:14px" data-dot><span style="width:6px;height:6px;border-radius:3px;background:var(--accent);display:block"></span></div>
          <div class="c c-title" style="display:flex;align-items:center;gap:10px"><span style="width:20px;height:20px;border-radius:3px;background:var(--bg-3) url(${x.c}) center/cover;flex:none"></span><span style="overflow:hidden;text-overflow:ellipsis">${esc(x.p.title)}</span></div>
          ${o.cmp ? '' : `<div class="c dim" style="width:150px">${esc(x.p.artist)}</div>`}<div class="c" style="width:${o.cmp ? 150 : 170}px;position:relative"><span class="dim" data-chg style="font-size:12.5px">${esc(changes(x))}</span><span data-done style="position:absolute;left:8px;top:0;bottom:0;color:var(--ok);display:flex;gap:6px;align-items:center;font-size:12.5px">${I('check', 's14')}Tagged</span></div>
          <div class="c r tnum dim" style="width:58px">${Math.round(x.s * 100)}</div></div>`).join('')}</div>
        <div class="toast" data-k="toast"><span class="ok">${I('circle-check', 's18')}</span><span><b style="font-weight:600">214 tracks tagged.</b> <span class="dim">Written through a verified copy.</span></span></div>
      </section>
      ${o.cmp ? '' : `<aside class="panel" style="width:${PW}px;flex:none"><div class="phead"><span class="ttl">Review tags</span><span class="muted tnum" style="font-size:12px">1 of 214</span><span class="iconbtn">${I('chevron-left')}</span><span class="iconbtn">${I('chevron-right')}</span></div>
        <div style="padding:16px 20px 0;flex:1">
          <div style="display:flex;gap:14px;align-items:center"><div style="width:72px;height:72px;border-radius:8px;border:1px dashed var(--line-3);display:flex;align-items:center;justify-content:center;color:var(--text-4);flex:none">${I('music-2', 's20')}</div><span class="muted">${I('arrow-right')}</span>
            <div data-k="cover" style="width:72px;height:72px;border-radius:8px;background:url(${sel.c}) center/cover;flex:none;box-shadow:0 0 0 2px var(--accent-line)"></div>
            <div style="min-width:0"><div style="font-weight:550">Add artwork</div><div class="muted" style="font-size:12px;margin-top:2px">Release cover · 1200 px</div></div></div>
          <div style="margin-top:16px;display:grid;grid-template-columns:22px 86px 1fr 1fr;column-gap:10px;font-size:11.5px;color:var(--text-3);font-weight:500;padding-bottom:6px;border-bottom:1px solid var(--line-2)"><span></span><span>Field</span><span>In your file</span><span>Proposed</span></div>
          ${fld.map(([k, c, n]) => `<div class="fld" data-fld><span class="cbx on">${I('check')}</span><span class="k">${k}</span><span class="cur">${c ? `<s>${esc(c)}</s>` : '<span style="color:var(--text-4)">empty</span>'}</span><span class="new" data-new>${n ? `<mark>${esc(n)}</mark>` : '<span style="color:var(--text-4)">removed</span>'}</span></div>`).join('')}
          <div style="margin-top:16px;display:flex;align-items:baseline;gap:8px"><span class="lbl11">Matched by fingerprint</span><span class="muted" style="font-size:12px">MusicBrainz · Discogs</span></div>
          <div class="cand" style="margin-top:8px" data-k="cand"><div style="width:52px;height:52px;border-radius:6px;background:url(${sel.c}) center/cover;flex:none"></div><div style="min-width:0;font-size:12.5px;line-height:17px"><div style="font-weight:600;font-size:13px">${esc(sel.p.album)}</div><div class="dim">T‐Connection · 1994 · Disc 1 · Track 6</div><div class="accent">MusicBrainz · Audio fingerprint · 99 / 100</div></div></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;padding:14px 20px;border-top:1px solid var(--line-1)"><span class="btn ghost">Not this song</span><span style="flex:1"></span><span class="btn">Skip</span><span class="btn primary">${I('check', 's14')}Apply 6 changes</span></div></aside>`}</div>`;
    const R = $$(root, '[data-r]').map(r => ({ el: r, dot: $(r, '[data-dot]'), chg: $(r, '[data-chg]'), done: $(r, '[data-done]') }));
    const F = $$(root, '[data-fld]').map(f => ({ s: $(f, 's'), n: $(f, '[data-new]') }));
    const cover = $(root, '[data-k=cover]'), cand = $(root, '[data-k=cand]'), apply = $(root, '[data-k=apply]'), applyl = $(root, '[data-k=applyl]');
    const readyc = $(root, '[data-k=readyc]'), taggedc = $(root, '[data-k=taggedc]'), toast = $(root, '[data-k=toast]');
    const cur = cursorLayer(root);
    const T0 = o.cmp ? 0.8 : 2.6; // when the confident batch is applied
    return {
      dur: T0 + 4.2, still: T0 + 3.0,
      render(t) {
        // the review panel resolves: what is in your file, what is proposed
        F.forEach((f, i) => { const a = .35 + i * .16; if (f.s) f.s.style.setProperty('--strike', E.out(seg(t, a, a + .35)) * 100 + '%');
          const k = E.out(seg(t, a + .12, a + .5)); setOp(f.n, k); setT(f.n, `translateX(${(1 - k) * 8}px)`); });
        if (cover) { const k = E.out5(seg(t, .3, .9)); setOp(cover, k); setT(cover, `scale(${.9 + k * .1})`); }
        if (cand) { const k = E.out(seg(t, 1.2, 1.7)); setOp(cand, k); setT(cand, `translateY(${(1 - k) * 8}px)`); }
        // the confident batch goes in at once
        const pr = cur.render(t, Object.assign([{ t: T0 - 1.0, x: W * (o.cmp ? .5 : .5), y: 420 }, { t: T0 - .15, el: apply, dx: -40, dy: 3 }], { hide: T0 + 1.0 }), [{ t: T0 }]);
        pressStyle(apply, pr);
        let n = 0;
        R.forEach((r, i) => { const a = T0 + .15 + i * .085; const k = E.out(seg(t, a, a + .3)); if (t > a) n++;
          setOp(r.chg, 1 - k); setOp(r.done, k); setT(r.done, `translateX(${(1 - k) * -6}px)`);
          r.dot.style.opacity = 1 - k; r.el.style.color = k > .5 ? 'var(--text-2)' : ''; });
        const applied = Math.round(tween(t, T0 + .1, T0 + .15 + R.length * .085 + .3, 0, 214, E.inOut));
        txt(readyc, String(214 - applied)); txt(taggedc, num(478 + applied));
        txt(applyl, applied === 0 ? 'Apply 214 confident' : applied < 214 ? `Applying ${applied} of 214` : '214 applied');
        apply.style.background = applied >= 214 ? 'var(--bg-3)' : ''; apply.style.color = applied >= 214 ? 'var(--text-2)' : ''; apply.style.borderColor = applied >= 214 ? 'var(--line-2)' : '';
        const tk = E.out5(seg(t, T0 + 1.9, T0 + 2.3)); setOp(toast, tk); setT(toast, `translate(-50%, ${(1 - tk) * 14}px)`);
      }
    };
  }

  /* ======================= BEATGRIDS: real grids on real tracks ======================= */
  // Solco's own output (window.GRIDS, extracted from the owner's library): the zoomed
  // waveform, every beat and bar line, and the tempo under it. Nothing is simulated.
  function decodeTrack(g) {
    if (g._z) return g;
    const b = Uint8Array.from(atob(g.zoom), c => c.charCodeAt(0)), o = Uint8Array.from(atob(g.overview), c => c.charCodeAt(0));
    const cols = a => { const r = []; for (let i = 0; i < a.length; i += 4) r.push([a[i], a[i + 1], a[i + 2], a[i + 3]]); return r; };
    const nz = cols(b), no = cols(o);
    const p99 = (arr, j) => { const v = arr.map(r => r[j]).sort((x, y) => x - y); return v[Math.floor(v.length * .99)] || 1; };
    const n4 = [0, 1, 2, 3].map(j => p99(nz, j));
    g._z = nz.map(r => r.map((x, j) => Math.min(1, x / n4[j])));
    g._d = { title: g.title + '#ov', overview: no, dur: g.dur, downbeats: g.down };
    // bar numbers: count downbeats up to a time
    g.barAt = t => { let lo = 0, hi = g.down.length; while (lo < hi) { const m = (lo + hi) >> 1; if (g.down[m] <= t + 1e-3) lo = m + 1; else hi = m; } return lo; };
    return g;
  }
  function gridLab(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = o.cmp ? 470 : 500; root.style.width = W + 'px'; root.style.height = H + 'px';
    const G = window.GRIDS.tracks.map(decodeTrack), TAB = 9, SPAN = o.cmp ? 3.6 : 6.2;
    root.innerHTML = `<div class="deck" style="height:100%;border:0">
      <div class="deck-head"><div class="art" style="display:flex;align-items:center;justify-content:center;color:var(--text-3)">${I('audio-waveform', 's20')}</div>
        <div class="tt"><div class="title" data-k="title"></div><div class="meta" data-k="meta"></div></div>
        <div class="stats"><div class="stat"><div class="v tnum" data-k="bpm"></div><div class="k" data-k="bpmk">BPM</div></div>
          ${o.cmp ? '' : '<div class="stat"><div class="v tnum" data-k="range"></div><div class="k">Tempo in this passage</div></div><div class="stat"><div class="v" data-k="key"></div><div class="k">Key</div></div>'}</div></div>
      <div style="padding:12px 20px 0"><div class="ov" style="height:64px"><canvas data-k="ov"></canvas></div></div>
      <div class="zoom" style="height:${o.cmp ? 170 : 200}px"><canvas data-k="zoom"></canvas></div>
      <div style="position:relative;height:74px;margin:0 0 0 0;border-bottom:1px solid var(--line-1)"><canvas data-k="tempo" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px 20px;font-size:12.5px;color:var(--text-2)"><span class="accent">${I('metronome', 's14')}</span><span data-k="note"></span><span style="flex:1"></span><span class="muted" data-k="conf"></span></div>
    </div>`;
    const ov = $(root, '[data-k=ov]'), zc = $(root, '[data-k=zoom]'), tc = $(root, '[data-k=tempo]');
    const title = $(root, '[data-k=title]'), meta = $(root, '[data-k=meta]'), bpm = $(root, '[data-k=bpm]'), bpmk = $(root, '[data-k=bpmk]'), range = $(root, '[data-k=range]'), key = $(root, '[data-k=key]'), note = $(root, '[data-k=note]'), conf = $(root, '[data-k=conf]');
    let shown = -1, fixed = null, fixedAt = 0, lastT = 0;
    const api = {
      dur: 1e9, still: 4.4, onTab: null, tabs: G.map(g => g.label),
      select(i) { fixed = i; fixedAt = lastT; api.render(lastT); },
      render(t) {
        lastT = t;
        const tab = fixed != null ? fixed : (window.__still ? 3 : Math.floor(t / TAB) % G.length);
        const local = fixed != null ? t - fixedAt : (window.__still ? 7.4 : t % TAB);
        const g = G[tab];
        if (tab !== shown) {
          shown = tab; ov.__th = zc.__th = null;
          txt(title, g.title); meta.innerHTML = `${esc(g.artist)}<span class="sep">·</span><span class="muted">${esc(g.label)}</span>`;
          if (key) key.innerHTML = `<span style="color:${window.UI.keyColor(g.camelot)}">${g.camelot}</span><small>${esc(g.key || '')}</small>`;
          if (range) range.innerHTML = g.regime === 'steady' ? `${g.bpm.toFixed(2)}<small>steady</small>` : `${g.wmin.toFixed(1)}–${g.wmax.toFixed(1)}`;
          note.innerHTML = g.regime === 'steady' ? 'One exact tempo for the whole track. Every line on a kick.' : g.label.startsWith('Ambient') ? 'No drums at all. The bars still land where the chords change.' : 'Played by people, so the tempo changes. The grid follows them, bar by bar.';
          txt(conf, `Solco beat model · confidence ${Math.round(g.confidence * 100)}`);
          if (api.onTab) api.onTab(tab);
        }
        const play = g.span - SPAN - 1;
        const at = g.start + SPAN / 2 + .5 + (local % play);
        const R = g.rate, n = g._z.length;
        const smp = { at: x => { const i = Math.floor((x - g.start) * R); return i >= 0 && i < n ? g._z[i] : null; } };
        const lines = g.beats.filter(b => Math.abs(b[0] - at) < SPAN).map(b => ({ t: b[0], down: b[1] === 1, a: b[1] === 1 ? .8 : .3, label: b[1] === 1 ? String(g.barAt(b[0])) : null }));
        const fade = fixed != null ? Math.min(1, (t - fixedAt) / .25) : Math.min(1, local / .25, (TAB - local) / .25);
        paintZoom(zc, g, { t: at, span: SPAN, sampler: smp, lines, alpha: .35 + .65 * Math.max(0, fade) });
        paintOverview(ov, g._d, { at, tempo: true, window: SPAN });
        // tempo strip: the local tempo at every beat, on a fixed +-4 BPM scale
        const { W: TW, H: TH, dpr } = window.UI.fit(tc); const cx = tc.getContext('2d');
        const cs = getComputedStyle(tc), grid = cs.getPropertyValue('--grid-rgb').trim() || '255,255,255';
        cx.clearRect(0, 0, TW, TH);
        const mid = g.regime === 'steady' ? g.bpm : (g.wmin + g.wmax) / 2, sc = Math.max(4, (g.wmax - g.wmin) / 2 + 1.2);
        const X = x => (x - (at - SPAN / 2)) / SPAN * TW, Y = v => TH / 2 + 6 * dpr - (v - mid) / sc * (TH / 2 - 16 * dpr);
        cx.fillStyle = `rgba(${grid},.06)`; for (const v of [mid - sc * .5, mid, mid + sc * .5]) cx.fillRect(0, Math.round(Y(v)), TW, dpr);
        const vis = g.beats.filter(b => Math.abs(b[0] - at) < SPAN * .75);
        cx.beginPath(); vis.forEach((b, i) => { const x = X(b[0]), y = Y(b[2]); i ? cx.lineTo(x, y) : cx.moveTo(x, y); });
        cx.strokeStyle = cs.getPropertyValue('--wf-mid').trim() || '#f09a4c'; cx.lineWidth = 2 * dpr; cx.lineJoin = 'round'; cx.stroke();
        for (const b of vis) { const x = X(b[0]); if (x < 0 || x > TW) continue; cx.fillStyle = b[1] === 1 ? cs.getPropertyValue('--text-1') : `rgba(${grid},.45)`; cx.beginPath(); cx.arc(x, Y(b[2]), (b[1] === 1 ? 2.6 : 1.8) * dpr, 0, 7); cx.fill(); }
        cx.font = `600 ${10.5 * dpr}px Geist, system-ui`; cx.fillStyle = cs.getPropertyValue('--text-3'); cx.textBaseline = 'top'; cx.fillText('TEMPO', 20 * dpr, 8 * dpr);
        cx.fillText(`${(mid + sc * .5).toFixed(1)}`, TW - 44 * dpr, Y(mid + sc * .5) - 14 * dpr); cx.fillText(`${(mid - sc * .5).toFixed(1)}`, TW - 44 * dpr, Y(mid - sc * .5) + 3 * dpr);
        cx.fillStyle = cs.getPropertyValue('--text-1'); cx.fillRect(TW / 2 - dpr, 0, 2 * dpr, TH);
        // readout: the tempo under the playhead
        let cur = vis[0]; for (const b of vis) if (b[0] <= at) cur = b;
        if (g.regime === 'steady') { txt(bpm, g.bpm.toFixed(2)); txt(bpmk, 'BPM'); } else { txt(bpm, cur ? cur[2].toFixed(1) : ''); txt(bpmk, 'BPM right now'); }
      }
    };
    return api;
  }

  /* ======================= GENRE: heard, not read ======================= */
  function genre(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 470; root.style.width = W + 'px'; root.style.height = H + 'px';
    const rows = S.genre;
    root.innerHTML = `<div class="vhead"><div class="ttl">Recently added</div><div class="sub tnum">${rows.length} tracks · style read from the audio</div><span style="flex:1"></span>
        <span class="btn primary" data-k="go">${I('check', 's14')}<span data-k="gol">Write style to genre</span></span></div>
      <div class="ghead"><div class="c c-title" style="padding-left:24px">Title</div>${o.cmp ? '' : '<div class="c c-artist" style="width:170px">Artist</div>'}<div class="c" style="width:${o.cmp ? 118 : 150}px">Genre tag</div><div class="c" style="width:${o.cmp ? 150 : 290}px">Heard by Solco</div>${o.cmp ? '' : '<div class="c c-bpm">BPM</div><div class="c c-key">Key</div>'}</div>
      <div class="rows">${rows.map(r => { const same = r.g && r.g.toLowerCase() === r.st[0].toLowerCase();
        return `<div class="row" data-r data-same="${same ? 1 : 0}" style="height:34px"><div class="c c-title" style="padding-left:24px">${esc(r.t)}</div>${o.cmp ? '' : `<div class="c c-artist" style="width:170px">${esc(r.a)}</div>`}
        <div class="c" style="width:${o.cmp ? 118 : 150}px;position:relative"><span data-old class="${r.g ? '' : 'muted'}">${r.g ? `<s>${esc(r.g)}</s>` : 'empty'}</span><span data-new style="position:absolute;left:8px;top:50%;transform:translateY(-50%)"><mark class="gmark">${esc(r.st[0])}</mark></span></div>
        <div class="c" style="width:${o.cmp ? 150 : 290}px;display:flex;gap:6px;align-items:center" data-st>${r.st.slice(0, o.cmp ? 1 : 3).map((s, i) => `<span class="chip ${i ? '' : 'acc'}" data-chip>${i ? esc(s) : `<b>${esc(s)}</b>`}</span>`).join('')}<span class="muted" data-listen style="font-size:12px;position:absolute">listening…</span></div>
        ${o.cmp ? '' : `<div class="c c-bpm tnum">${bpmf(r.bpm)}</div><div class="c c-key">${keyHtml(r.k)}</div>`}</div>`; }).join('')}</div>
      <div class="toast" data-k="toast"><span class="ok">${I('circle-check', 's18')}</span><span><b style="font-weight:600">6 genre tags written.</b> <span class="dim">2 were already right.</span></span></div>`;
    const R = $$(root, '[data-r]').map(r => ({ el: r, same: r.dataset.same === '1', old: $(r, '[data-old]'), s: $(r, 's'), nw: $(r, '[data-new]'), chips: $$(r, '[data-chip]'), listen: $(r, '[data-listen]') }));
    const go = $(root, '[data-k=go]'), gol = $(root, '[data-k=gol]'), toast = $(root, '[data-k=toast]');
    const cur = cursorLayer(root); const TG = 2.9;
    return {
      dur: TG + 3.2, still: TG + 3.0,
      render(t) {
        R.forEach((r, i) => {
          const a = .2 + i * .17, k = E.out(seg(t, a + .35, a + .7));
          setOp(r.listen, seg(t, a, a + .1) * (1 - seg(t, a + .3, a + .4)));
          r.chips.forEach((c, j) => { const kj = E.out5(seg(t, a + .35 + j * .07, a + .65 + j * .07)); setOp(c, kj); setT(c, `scale(${.85 + .15 * kj})`); });
          const w = TG + .25 + i * .1, kw = E.out(seg(t, w, w + .35));
          if (r.same) { setOp(r.nw, 0); r.old.style.color = kw > .5 ? 'var(--ok)' : ''; }
          else { if (r.s) r.s.style.setProperty('--strike', kw * 100 + '%'); setOp(r.old, 1 - E.out(seg(t, w + .25, w + .5))); setOp(r.nw, E.out(seg(t, w + .3, w + .6))); setT(r.nw, `translate(${(1 - E.out(seg(t, w + .3, w + .6))) * 8}px,-50%)`); }
        });
        const pr = cur.render(t, Object.assign([{ t: TG - 1.0, x: W * .55, y: 330 }, { t: TG - .15, el: go, dx: -30, dy: 3 }], { hide: TG + .9 }), [{ t: TG }]);
        pressStyle(go, pr);
        const done = t > TG + 1.3; txt(gol, done ? 'Written' : 'Write style to genre');
        go.style.background = done ? 'var(--bg-3)' : ''; go.style.color = done ? 'var(--text-2)' : ''; go.style.borderColor = done ? 'var(--line-2)' : '';
        const tk = E.out5(seg(t, TG + 1.5, TG + 1.9)); setOp(toast, tk); setT(toast, `translate(-50%, ${(1 - tk) * 14}px)`);
      }
    };
  }

  /* ======================= 6 · PLAYLISTS ======================= */
  function playlists(root, o = {}) {
    const W = o.cmp ? 560 : 1100, H = 520; root.style.width = W + 'px'; root.style.height = H + 'px';
    const all = S.pool;
    const st1 = all.filter(t => t.bpm >= 120 && t.bpm < 125).sort((a, b) => a.bpm - b.bpm);
    const st2 = st1.filter(t => t.k === '8A'); const st3 = st2.filter(t => t.e >= 60);
    const stages = [{ rows: all.slice(0, 14), count: '9,440 tracks' }, { rows: st1.slice(0, 14), count: '1,204 tracks' }, { rows: st2, count: '96 tracks' }, { rows: st3, count: `${st3.length} tracks · ${Math.round(st3.reduce((s, t) => s + t.d, 0) / 60)} min` }];
    const typed = [['bpm:120..124', 'BPM', '120–124'], ['key:8A', 'Key', '8A'], ['energy:>=60', 'Energy', '≥ 60']];
    const T = [[.4, 1.25, 1.35], [1.75, 2.2, 2.3], [2.7, 3.35, 3.45]]; // type start, type end, chip
    const PW = 420;
    const rowH = t => `<div class="row"><div class="c c-title">${esc(t.t)}</div>${o.cmp ? '' : `<div class="c c-artist" style="width:170px">${esc(t.a)}</div>`}<div class="c c-bpm tnum">${bpmf(t.bpm)}</div><div class="c c-key">${keyHtml(t.k)}</div><div class="c c-energy"><span class="meter"><span class="bar"><i style="width:${t.e}%"></i></span><span class="tnum">${t.e}</span></span></div><div class="c c-feel">${feelHtml(t.f)}</div></div>`;
    const plan = S.chat;
    root.innerHTML = `<div style="display:flex;height:100%"><section style="flex:1;min-width:0;display:flex;flex-direction:column">
      <div class="lib-head" style="height:60px"><span class="ttl">New playlist</span><span class="sub tnum" data-k="count">9,440 tracks</span></div>
      <div style="padding:0 16px 12px 20px"><div class="search focus" data-k="search" style="height:40px">${I('search', 's14')}<span data-k="chips" style="display:flex;gap:6px"></span><span class="typing" data-k="typing"></span><span class="caret" data-k="caret"></span></div></div>
      <div class="ghead"><div class="c c-title">Title</div>${o.cmp ? '' : '<div class="c c-artist" style="width:170px">Artist</div>'}<div class="c c-bpm">BPM</div><div class="c c-key">Key</div><div class="c c-energy">Energy</div><div class="c c-feel">Feel</div></div>
      <div style="position:relative;flex:1;overflow:hidden;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent)">${stages.map((s, i) => `<div class="rows" data-stage style="position:absolute;inset:0">${s.rows.map(rowH).join('')}</div>`).join('')}</div>
      <div data-k="save" style="display:flex;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid var(--line-1)"><span class="muted" style="font-size:12.5px;flex:1">A smart playlist keeps itself up to date as your library grows.</span><span class="btn">${I('list-sparkles', 's14')}Save as smart playlist</span></div>
      </section>
      ${o.cmp ? '' : `<aside class="panel" style="width:${PW}px;flex:none"><div class="phead"><span class="accent">${I('sparkle', 's18')}</span><span class="ttl">Assistant</span><span class="iconbtn">${I('x')}</span></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px;padding:14px 18px 0;justify-content:flex-end">
          <div class="msg-u" data-k="u1">I'm opening a disco night, 22:00 to 01:00. Start warm and funky, build to peak disco.</div>
          <div class="msg-a" data-k="a1">Four 45‑minute steps. Energy climbs from the mid‑50s into the 70s, BPM from 100 to 128.</div>
          <div class="card" data-k="card" style="background:var(--bg-1);overflow:hidden"><div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line-1)">${I('folder', 's14')}<b style="font-weight:600">Disco Night · 22–01</b><span class="muted" style="font-size:12px">created</span><span style="flex:1"></span><span class="muted" style="font-size:12px">Undo</span></div>
            <div style="display:flex;align-items:flex-end;gap:10px;height:70px;padding:8px 14px 6px">${plan.map((p, i) => `<div style="flex:1;display:flex;flex-direction:column;gap:5px"><span class="muted tnum" style="font-size:11px">${p.e[0]}–${p.e[1]}</span><span data-bar style="height:5px;border-radius:3px;background:${charColor(p.e[1])};transform-origin:left;display:block;margin-bottom:${i * 7}px"></span><span class="muted tnum" style="font-size:11px">${p.s}</span></div>`).join('')}</div>
            ${plan.map(p => `<div data-pl style="display:flex;align-items:center;gap:10px;height:30px;padding:0 12px;border-top:1px solid var(--line-1)"><span class="muted tnum" style="width:40px">${p.s}</span><span style="flex:1">${esc(p.n.replace(/^DN \d · /, ''))}</span><span class="muted tnum" style="font-size:12px">${p.c} tracks</span></div>`).join('')}</div>
        </div>
        <div style="margin:12px 16px 14px;border:1px solid var(--line-3);border-radius:12px;background:var(--bg-1);padding:9px 10px 9px 14px;display:flex;align-items:center"><span class="muted" style="flex:1">Describe a gig, or refine these playlists…</span><span class="play" style="width:28px;height:28px">${I('arrow-right', 's14')}</span></div></aside>`}</div>`;
    const chipsEl = $(root, '[data-k=chips]'), typing = $(root, '[data-k=typing]'), caret = $(root, '[data-k=caret]'), count = $(root, '[data-k=count]');
    chipsEl.innerHTML = typed.map(([, k, v]) => `<span class="chip" data-chip><span>${k}</span><b>${v}</b></span>`).join('');
    const chips = $$(chipsEl, '[data-chip]'), stageEls = $$(root, '[data-stage]');
    const u1 = $(root, '[data-k=u1]'), a1 = $(root, '[data-k=a1]'), card = $(root, '[data-k=card]'), bars = $$(root, '[data-bar]'), pls = $$(root, '[data-pl]');
    const TA = 4.0;
    return {
      dur: o.cmp ? 4.4 : TA + 3.6, still: o.cmp ? 4.3 : TA + 3.5,
      render(t) {
        let text = '', stage = 0;
        typed.forEach(([s], i) => { const [a, b, c] = T[i];
          const shown = t >= c; if (shown) stage = i + 1;
          const ck = E.out5(seg(t, c, c + .3)); chips[i].style.display = t >= c ? '' : 'none'; setOp(chips[i], ck); setT(chips[i], `scale(${.85 + .15 * ck})`);
          if (t >= a && t < c) text = s.slice(0, Math.round(seg(t, a, b) * s.length)); });
        txt(typing, text); caret.style.opacity = (t > 3.6 && Math.floor(t * 2) % 2) ? 0 : 1;
        txt(count, stages[stage].count);
        stageEls.forEach((el, i) => { const sIn = i === 0 ? -1 : T[i - 1][2]; const sOut = i < 3 ? T[i][2] : 1e9;
          const kin = i === 0 ? 1 : E.out(seg(t, sIn, sIn + .35)), kout = E.out(seg(t, sOut, sOut + .2));
          setOp(el, kin * (1 - kout)); setT(el, `translateY(${(1 - kin) * 8}px)`); });
        if (u1) { const k1 = E.out(seg(t, TA, TA + .4)); setOp(u1, k1); setT(u1, `translateY(${(1 - k1) * 10}px)`);
          const k2 = E.out(seg(t, TA + .7, TA + 1.1)); setOp(a1, k2); setT(a1, `translateY(${(1 - k2) * 8}px)`);
          const k3 = E.out5(seg(t, TA + 1.3, TA + 1.8)); setOp(card, k3); setT(card, `translateY(${(1 - k3) * 12}px)`);
          bars.forEach((b, i) => b.style.transform = `scaleX(${E.out(seg(t, TA + 1.6 + i * .15, TA + 2.1 + i * .15))})`);
          pls.forEach((p, i) => setOp(p, E.out(seg(t, TA + 1.9 + i * .12, TA + 2.3 + i * .12)))); }
      }
    };
  }

  /* ======================= 7 · EXPORT ======================= */
  function exportDemo(root, o = {}) {
    const W = o.cmp ? 560 : 1100, H = 560; root.style.width = W + 'px'; root.style.height = H + 'px';
    const pls = [['Disco Night · 22–01', 4, 1], ['DN 1 · Warm & Funky', 29, 2], ['DN 2 · Groove In', 68, 2], ['DN 3 · The Build', 128, 2], ['DN 4 · Peak Disco', 104, 2], ['Floppy Disco', 21, 0], ['Deep House', 988, 0], ['Warm-up', 830, 0]];
    const GB = 59.6, other = 4.8, lib = 16.4, add = 2.1;
    root.innerHTML = `<div style="display:flex;height:100%;gap:0">
      <section style="flex:1;min-width:0;padding:0 0 0 0;display:flex;flex-direction:column">
        <div class="vhead"><div class="ttl">Export</div>${o.cmp ? '' : '<div class="sub">Prepare a USB drive for the club</div>'}</div>
        <div style="padding:0 20px 0 24px"><div class="lbl11" style="margin-bottom:10px">What to export</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div style="border:1px solid var(--line-2);border-radius:10px;padding:12px 14px"><div style="display:flex;gap:10px;align-items:center;font-weight:600"><span class="radio"></span>Everything</div><div class="dim" style="margin:3px 0 0 26px;font-size:12.5px">All 9,440 tracks and 66 playlists.</div></div>
            <div style="border:1px solid var(--accent-line);background:var(--accent-soft);border-radius:10px;padding:12px 14px;box-shadow:inset 0 0 0 1px var(--accent-line)"><div style="display:flex;gap:10px;align-items:center;font-weight:600"><span class="radio on"></span>Chosen playlists</div><div class="dim" style="margin:3px 0 0 26px;font-size:12.5px">Only what you tick.</div></div></div>
          <div style="margin-top:12px;border:1px solid var(--line-1);border-radius:10px;padding:6px 0;background:var(--bg-1)">
            ${pls.map(([n, c, lv], i) => `<div style="height:30px;display:flex;align-items:center;gap:10px;padding:0 14px 0 ${lv === 2 ? 42 : 14}px"><span class="cbx" data-cb="${lv}">${I('check')}</span>${I(lv === 2 ? 'list-sparkles' : 'folder', 's14 muted')}<span style="flex:1">${esc(n)}</span><span class="muted tnum" style="font-size:12px">${c}</span></div>`).join('')}</div>
          <div class="dim" style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:12.5px;line-height:18px">${I('info', 's14 muted')}<span>Export only adds and updates. Nothing on the drive is removed, so tracks you put there from another computer stay.</span></div></div>
      </section>
      ${o.cmp ? '' : `<aside style="width:430px;flex:none;padding:20px 20px 20px 0;display:flex;flex-direction:column;gap:12px">
        <div class="card" style="padding:16px 18px"><div style="display:flex;align-items:center;gap:10px">${I('usb-drive', 's18')}<div style="flex:1"><div style="font-weight:600">FRIDAY</div><div class="muted" style="font-size:12px">USB drive · 59.60 GiB · FAT32</div></div><span class="btn sm">${I('eject', 's12')}Eject</span></div>
          <div class="prog" style="margin-top:14px;height:8px;gap:2px;background:var(--bg-4)"><i style="width:${other / GB * 100}%;background:#5b5f67"></i><i style="width:${lib / GB * 100}%;background:#9ea1a8"></i><i data-k="addbar" style="width:0;background:var(--accent)"></i></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-top:10px;font-size:12px" class="muted"><span>■ Other files 4.8 GB</span><span>■ Already on the drive 16.4 GB</span><span class="accent" data-k="addlab">■ This export 2.1 GB</span><span data-k="free">Free after 38.3 GB</span></div></div>
        <div class="card" style="padding:16px 18px;position:relative;overflow:hidden" data-k="ready">
          <div style="display:flex;align-items:baseline;gap:10px"><span class="ttl-f" style="font-size:23px" data-k="rt">Ready</span><span class="muted" data-k="rs">CDJ and XDJ players</span></div>
          <div class="btn primary lg" data-k="go" style="width:100%;margin-top:14px;height:40px">${I('usb-drive', 's14')}<span data-k="gol">Export 4 playlists to FRIDAY</span></div>
          <div data-k="progwrap" style="margin-top:14px"><div class="prog" style="height:6px"><i data-k="prog" style="width:0;background:var(--accent)"></i></div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px"><span data-k="pl">Adding 187 tracks</span><span class="muted tnum" data-k="pc">0 of 187</span></div></div>
          <div data-k="fin" style="margin-top:14px;display:flex;flex-direction:column;gap:7px;font-size:12.5px">
            <div style="display:flex;gap:8px;align-items:center"><span class="ok">${I('circle-check', 's14')}</span>187 added, 142 already on the drive</div>
            <div style="display:flex;gap:8px;align-items:center"><span class="ok">${I('circle-check', 's14')}</span>Nothing removed. Your played sets are kept.</div>
            <div style="display:flex;gap:8px;align-items:center"><span class="ok">${I('circle-check', 's14')}</span>Ejected safely. Take it to the club.</div></div>
        </div></aside>`}</div>`;
    const cbs = $$(root, '[data-cb]');
    const addbar = $(root, '[data-k=addbar]'), go = $(root, '[data-k=go]'), gol = $(root, '[data-k=gol]'), prog = $(root, '[data-k=prog]'), progwrap = $(root, '[data-k=progwrap]'), pc = $(root, '[data-k=pc]'), pl = $(root, '[data-k=pl]'), fin = $(root, '[data-k=fin]'), rt = $(root, '[data-k=rt]'), rs = $(root, '[data-k=rs]');
    const cur = cursorLayer(root);
    const TG = 2.0;
    return {
      dur: o.cmp ? 1.6 : 6.4, still: o.cmp ? 1.5 : 6.3,
      render(t) {
        cbs.forEach((c, i) => { const on = +c.dataset.cb > 0 && t > .3 + i * .14; c.className = 'cbx' + (on ? ' on' : ''); c.style.transform = on ? `scale(${1 + .15 * (1 - E.out(seg(t, .3 + i * .14, .55 + i * .14)))})` : ''; });
        if (!go) return;
        const plan = E.out(seg(t, .9, 1.3)), fill = seg(t, TG + .2, TG + 2.8);
        addbar.style.width = (add / GB * 100 * plan) + '%';
        addbar.style.background = fill < 1 ? `linear-gradient(90deg, var(--accent) ${fill * 100}%, rgba(185,163,255,.35) ${fill * 100}%)` : 'var(--accent)';
        const pr = cur.render(t, Object.assign([{ t: 1.0, x: 700, y: 480 }, { t: TG - .15, el: go, dx: -60, dy: 3 }], { hide: TG + .8 }), [{ t: TG }]);
        pressStyle(go, pr);
        const running = t >= TG && fill < 1, done = fill >= 1;
        go.style.display = t < TG + .15 ? '' : 'none';
        progwrap.style.display = t >= TG + .15 && !(t > TG + 3.1) ? '' : 'none';
        fin.style.display = t > TG + 3.1 ? '' : 'none';
        prog.style.width = E.inOut(fill) * 100 + '%';
        const n = Math.round(E.inOut(fill) * 187); txt(pc, `${n} of 187`);
        txt(pl, fill < .85 ? `Adding ${['DN 1 · Warm & Funky', 'DN 2 · Groove In', 'DN 3 · The Build', 'DN 4 · Peak Disco'][Math.min(3, Math.floor(fill * 4))]}` : 'Writing playlists, cues and grids');
        $$(fin, ':scope > div').forEach((r, i) => { const k = E.out(seg(t, TG + 3.1 + i * .22, TG + 3.5 + i * .22)); setOp(r, k); setT(r, `translateY(${(1 - k) * 6}px)`); });
        txt(rt, done ? 'Done' : running ? 'Exporting' : 'Ready'); txt(rs, done ? 'FRIDAY is ready for the club' : 'CDJ and XDJ players');
      }
    };
  }

  /* ======================= the club player reading the USB ======================= */
  function player(root, o = {}) {
    const W = 640, H = 400; root.style.width = W + 'px'; root.style.height = H + 'px';
    const rows = S.chat[0].tracks.slice(0, 7);
    root.innerHTML = `<div class="lcd" style="position:absolute;inset:0;background:#030405;border-radius:14px;overflow:hidden;font-family:'Geist',sans-serif">
      <div style="height:34px;display:flex;align-items:center;gap:10px;padding:0 16px;background:#0b0d12;border-bottom:1px solid #1b1f28;font-size:12px;letter-spacing:.06em;color:#8b93a6"><span style="color:#dfe6ff;font-weight:600">USB</span><span>FRIDAY</span><span style="flex:1"></span><span>PLAYLIST</span></div>
      <div style="height:30px;display:flex;align-items:center;gap:8px;padding:0 16px;font-size:12.5px;color:#8b93a6;border-bottom:1px solid #141821">Disco Night · 22–01 <span style="color:#4a5163">›</span> <span style="color:#e8ecf6">DN 1 · Warm &amp; Funky</span></div>
      <div data-k="list">${rows.map((t, i) => `<div data-r style="height:34px;display:flex;align-items:center;gap:12px;padding:0 16px;font-size:14px;color:#dfe4ee;border-bottom:1px solid #0f1218;position:relative"><span style="width:22px;color:#5a6275;font-size:12px" class="tnum">${String(i + 1).padStart(2, '0')}</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.t)}</span><span style="width:52px;text-align:right;color:#aab3c6" class="tnum">${t.bpm.toFixed(1)}</span><span style="width:40px;text-align:right;color:${window.UI.keyColor(t.k)}">${t.k}</span></div>`).join('')}</div>
      <div data-k="sel" style="position:absolute;left:0;right:0;height:34px;background:rgba(126,164,255,.18);border-top:1px solid rgba(126,164,255,.5);border-bottom:1px solid rgba(126,164,255,.5)"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:62px;border-top:1px solid #1b1f28;background:#07080b;display:flex;align-items:center;gap:14px;padding:0 16px" data-k="load">
        <div style="font-size:11px;color:#8b93a6;letter-spacing:.08em">LOADED</div><div style="flex:1;min-width:0"><div style="font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-k="lt">${esc(rows[0].t)}</div><div style="font-size:12px;color:#8b93a6" data-k="la">${esc(rows[0].a)}</div></div>
        <div style="display:flex;gap:4px">${window.UI.CUES.slice(0, 5).map(c => `<span style="width:14px;height:14px;border-radius:3px;background:${c.c}"></span>`).join('')}</div><div class="tnum" style="font-size:22px;color:#fff;font-weight:500" data-k="lb">${rows[0].bpm.toFixed(1)}</div></div>
    </div>`;
    const sel = $(root, '[data-k=sel]'), rs = $$(root, '[data-r]'), load = $(root, '[data-k=load]'), lt = $(root, '[data-k=lt]'), la = $(root, '[data-k=la]'), lb = $(root, '[data-k=lb]');
    const pick = 2;
    return {
      dur: 3.2, still: 3.0,
      render(t) {
        rs.forEach((r, i) => { const k = E.out(seg(t, .05 + i * .06, .35 + i * .06)); setOp(r, k); });
        const idx = t < .9 ? 0 : t < 1.2 ? 1 : pick;
        sel.style.top = (64 + idx * 34) + 'px'; setOp(sel, seg(t, .4, .6));
        const lk = E.out5(seg(t, 1.7, 2.1)); setOp(load, .35 + .65 * lk);
        const tr = rows[t > 1.7 ? pick : 0]; txt(lt, tr.t); txt(la, tr.a); txt(lb, t > 1.7 ? tr.bpm.toFixed(1) : '–');
      }
    };
  }

  window.DEMOS = { hero, addMusic, analysis, duplicates, tags, gridLab, genre, playlists, exportDemo, player, sidebar, deckHtml };
})();
