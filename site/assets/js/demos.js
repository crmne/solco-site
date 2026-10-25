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
  // The sidebar as Solco draws it (Solco ADRs 0172, 0239, 0241): Library with its add, assistant and
  // settings buttons, the library views, the Prep steps, the playlists, and Activity and the drive at the foot.
  function sidebar(o = {}) {
    const st = o.steps || {};
    const steps = [['Add music', '3 folders', 'done'], ['Analysis', '9,440', 'done'], ['Tags', '779', 'next'], ['Duplicates', '', 'done'], ['Beatgrids', '', 'done'], ['Playlists', '66', 'done'], ['Export', '', 'done']]
      .map(([l, c, s], i) => { const x = st[i] || {}; return { l, c: x.c ?? c, s: x.s ?? s, sel: x.sel }; });
    const todo = steps.filter(s => s.s !== 'done').length;
    // [kind, name, count, open or nested, selected]; playlists are 'pl', smart playlists 'sp'
    const tree = o.tree || [['folder', 'Genres', 6], ['folder', 'Floppy Disco', 4, true], ['pl', 'FD 01 · Doors Open', 143, 1], ['pl', 'FD 02 · Early Groove', 122, 1, true], ['pl', 'FD 03 · Floor Building', 98, 1], ['pl', 'FD 04 · Peak Disco', 76, 1], ['folder', 'Down the Rabbit Hole', 19], ['folder', 'Melodic House & Techno', 8], ['sp', 'Deep House', 988], ['sp', 'House', '2,296'], ['sp', 'Disco', 348], ['sp', 'Techno', '1,551'], ['sp', 'Ambient', 623], ['sp', 'Minimal', 324], ['pl', 'Warm-up', 830]];
    return `<aside class="side">
      <div class="side-top">${I('panel-left', 's18 dim')}<span class="name">Library</span><span class="iconbtn">${I('plus')}</span><span class="iconbtn">${I('message-square')}</span><span class="iconbtn">${I('settings')}</span></div>
      <div class="nav ${o.sel === 'all' ? 'sel' : ''}">${I('file-music')}<span class="lbl">All tracks</span><span class="cnt">9,440</span></div>
      <div class="nav ${o.sel === 'recent' ? 'sel' : ''}" data-k="recent">${I('clock-3')}<span class="lbl">Recently added</span><span class="cnt" data-k="recentc">${o.recent ?? 0}</span></div>
      <div class="sec"><span class="t">Prep</span><span class="aside" data-k="prepaside">${o.prepAside ?? (todo ? `${todo} to do` : '')}</span></div>
      ${steps.map((s, i) => `<div class="step ${s.s} ${s.sel ? 'sel' : ''}" data-step="${i}"><span class="dot">${s.s === 'done' ? I('check', 's14') : i + 1}</span><span class="lbl">${s.l}</span><span class="cnt tnum">${s.c}</span></div>`).join('')}
      <div class="sec pl"><span class="t">Playlists</span><span class="iconbtn sm">${I('sparkle', 's16')}</span><span class="iconbtn sm">${I('plus', 's16')}</span></div>
      ${tree.map(([k, n, c, x, y]) => k === 'folder'
        ? `<div class="nav tree">${I(x ? 'chevron-down' : 'chevron-right', 's12 dim')}${I('folder', 's16')}<span class="lbl">${n}</span><span class="cnt">${c}</span></div>`
        : `<div class="nav tree ${y ? 'sel' : ''} ${x ? 'nested' : ''}">${I(k === 'sp' ? 'list-sparkles' : 'list-music', 's16')}<span class="lbl">${n}</span><span class="cnt">${c}</span></div>`).join('')}
      <div class="side-foot"><div class="activity"><span class="act-ico" data-k="actico" style="${o.act ? 'display:none' : ''}">${I('circle-check', 's14')}</span><span class="spin" data-k="spin" style="${o.act ? '' : 'display:none'}"></span><span class="act-l" data-k="act">${o.act || 'Library up to date'}</span></div>
        <div class="activity">${I('usb-drive', 's14')}<span style="flex:1"><b>FRIDAY</b> · 42.2 GB free</span>${I('eject', 's14')}</div></div>
    </aside>`;
  }
  // The library table on Character (Solco ADRs 0247, 0250, 0266): the waveform, the title with its artist under
  // it, BPM, key, feel and style, then every characteristic from 0 to 100 in one colour scale. Mood is off by
  // default. At this width the table scrolls sideways, so the last columns sit past the edge, as in the app.
  const NUMS = [['Energy', 'e'], ['Drive', 'dr'], ['Peak', 'p'], ['Stability', 'stb'], ['Happy', 'hp'], ['Sad', 'sd'], ['Calm', 'cl'], ['Dance', 'dn'], ['Party', 'pa'], ['Edge', 'ed'], ['Vocals', 'v']];
  // o.nums picks the readings shown (all by default); o.wave and o.style can leave those columns out on narrow stages
  const numsOf = o => o.nums ? NUMS.filter(([n]) => o.nums.includes(n)) : NUMS;
  const reading = (t, k) => t[k] == null ? '<span class="nd">–</span>' : Math.round(t[k]);
  const libRow = (t, o = {}) => `<div class="row lib ${o.cls || ''}" ${o.attr || ''}><div class="c c-gut">${o.cls && o.cls.includes('playing') ? I('play-filled', 'fill s12') : ''}</div>${o.wave === false ? '' : '<div class="c c-wave"><canvas data-wave></canvas></div>'}<div class="c c-title"><span class="tl">${esc(t.t)}</span><span class="ar">${esc(t.a)}</span></div><div class="c c-bpm tnum" data-v>${bpmf(t.bpm)}</div><div class="c c-key" data-v>${keyHtml(t.k)}</div><div class="c c-feel" data-v>${feelHtml(t.f)}</div>${o.style === false ? '' : `<div class="c c-style" data-v>${esc(t.s)}</div>`}${numsOf(o).map(([n, k]) => `<div class="c c-num c-${n.toLowerCase()} tnum" data-v style="color:${charColor(t[k])}">${reading(t, k)}</div>`).join('')}</div>`;
  const libHeadOf = (o = {}) => `<div class="ghead lib"><div class="c c-gut"></div>${o.wave === false ? '' : '<div class="c c-wave">Waveform</div>'}<div class="c c-title">Title</div><div class="c c-bpm">BPM</div><div class="c c-key">Key</div><div class="c c-feel">Feel</div>${o.style === false ? '' : '<div class="c c-style">Style</div>'}${numsOf(o).map(([n]) => `<div class="c c-num c-${n.toLowerCase()}">${n}</div>`).join('')}</div>`;
  const libHead = libHeadOf();
  const paintRows = (root, rows) => $$(root, '[data-wave]').forEach((cv, i) => rows[i] && window.UI.paintPreview(cv, rows[i]));

  // The deck as Solco draws it: artwork, title and readouts; the overview beside the character panel; the zoomed
  // waveform with its bar ruler; then the toolbar (Solco ADRs 0221, 0224, 0261, 0263).
  function deckHtml(d, o = {}) {
    const pads = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l, i) => { const c = window.UI.CUES[i]; return `<span class="pad ${c ? 'set' : ''}" style="${c ? 'background:' + c.c : ''}">${l}</span>`; }).join('');
    return `<div class="deck">
      <div class="deck-head"><div class="art" style="background-image:url(${d.cover})"></div>
        <div class="tt"><div class="title">${esc(d.title)}</div><div class="meta">${esc(d.artist)}<span class="sep">·</span>${esc(d.album)}<span class="sep">·</span>${d.year}<span class="sep">·</span><span class="muted">${d.styles[0]}</span></div></div>
        <div class="stats"><div class="stat"><div class="v tnum">${d.bpm.toFixed(2)}</div><div class="k">BPM</div></div>
          <div class="stat"><div class="v" style="color:${window.UI.keyColor(d.camelot)}">${d.camelot}<small>${d.keyname}</small></div><div class="k">Key</div></div>
          <div class="stat"><div class="v tnum" data-k="remain">−0:00<small>of ${mmss(d.dur)}</small></div><div class="k">Remaining</div></div>
          <div class="stat"><div class="v tnum dim">${d.lufs.toFixed(1).replace('-', '−')}<small>LUFS</small></div><div class="k">Loudness</div></div></div>
        <div class="deck-menu"><span>${I('chevron-up', 's16')}</span><span>${I('more-horizontal', 's16')}</span></div></div>
      <div class="deck-mid"><div class="ov"><canvas data-k="ov"></canvas></div>${window.UI.charBox(d)}</div>
      <div class="zoom" style="${o.zoomH ? 'height:' + o.zoomH + 'px' : ''}"><canvas data-k="zoom"></canvas></div>
      <div class="tools"><span class="play" data-k="play">${I('pause-filled', 'fill s18')}</span>
        <span class="pads">${pads}</span><span class="pad mem">M</span>
        <span class="grp"><span class="seg-b">½×</span><span class="seg-b">${I('repeat', 's16')}<b>4</b></span><span class="seg-b">×2</span></span>
        <span class="grp"><span class="seg-b on">Q</span><span class="seg-b">${I('metronome', 's16')}</span></span>
        <span style="flex:1"></span>
        <span class="grp"><span class="seg-b">${I('zoom-out', 's16')}</span><span class="seg-b">${I('zoom-in', 's16')}</span></span>
        <span class="grp"><span class="seg-b">${I('chevron-left', 's16')}</span><span class="seg-b wide"><i class="dbar"></i>Downbeat</span><span class="seg-b">${I('chevron-right', 's16')}</span></span>
        <span class="grp"><span class="seg-b">½×</span><span class="seg-b wide tnum">${d.bpm.toFixed(2)}<small>BPM</small></span><span class="seg-b">×2</span></span>
        <span class="grp"><span class="seg-b">${I('check', 's16')}</span></span></div>
    </div>`;
  }

  function hero(root) {
    const d = S.deck; const W = 1280, H = 800;
    root.style.width = W + 'px'; root.style.height = H + 'px';
    const rows = S.lib.slice(0, 12); rows.splice(3, 0, { t: d.title, a: d.artist, s: 'Disco', bpm: d.bpm, k: d.camelot, e: Math.round(d.energy), f: d.feel, p: d.peak, dr: d.arousal, stb: d.stability, hp: d.happy, cl: d.calm, sd: d.sad, dn: d.dance, pa: d.party, ed: d.edge, v: d.vocal, _w: d.overview, lufs: d.lufs, playing: true });
    root.innerHTML = sidebar() + `<div class="main">${deckHtml(d)}
      <div class="lib-head"><span class="ttl">FD 02 · Early Groove</span><span class="sub">122 tracks</span>
        <div class="search">${I('search', 's16')}<span class="ph">Search 122 tracks</span><span style="flex:1"></span>${I('list-sparkles', 's16 dim')}</div><span class="iconbtn">${I('columns-3', 's18')}</span></div>
      <div class="table">${libHead}<div class="rows">${rows.map(t => libRow(t, { cls: t.playing ? 'playing sel' : '' })).join('')}</div></div></div>`;
    const ov = $(root, '[data-k=ov]'), zc = $(root, '[data-k=zoom]'), rem = $(root, '[data-k=remain]');
    const waves = $$(root, '[data-wave]');
    const smp = zoomSampler(d, 4); const cues = cueTimes(d);
    const tagsCnt = $(root, '[data-step="2"] .cnt');
    const spin = $(root, '[data-k=spin]'), actico = $(root, '[data-k=actico]'), act = $(root, '[data-k=act]'), recentc = $(root, '[data-k=recentc]');
    // new downloads file themselves into the smart playlists they fit
    const FILE = { 'Deep House': 3, 'House': 4, 'Disco': 3, 'Techno': 2 };
    const fileEls = $$(root, '.side .nav').map(n => { const l = $(n, '.lbl'), c = $(n, '.cnt'); const add = l && FILE[l.textContent]; if (!add) return null;
      const base = parseInt(c.textContent.replace(/,/g, '')); return { n, c, base, add }; }).filter(Boolean);
    const T1 = 1.0, T2 = 3.4;
    let previews = false;
    return {
      dur: 1e9, still: 4.2,
      render(t) {
        if (!previews) { previews = true; waves.forEach((cv, i) => window.UI.paintPreview(cv, rows[i], rows[i].playing ? cues.map(c => ({ ...c, f: c.t / d.dur })) : [])); }
        const at = smp.L0 + 1.2 + t;
        const lines = steadyLines(d, at - 5, at + 5);
        // bar labels follow the real downbeats of the loop
        paintZoom(zc, d, { t: at, span: 7, sampler: smp, cues, lines: lines.map(L => ({ ...L, label: L.down ? String(89 + Math.round((L.t - smp.L0) / (4 * smp.beat))) : null })) });
        paintOverview(ov, d, { at: smp.L0 + 1.2 + (t % 400), cues, window: 7 });
        txt(rem, `−${mmss(d.dur - (smp.L0 + 1.2 + t))}`);
        if (!rem.querySelector('small')) rem.insertAdjacentHTML('beforeend', `<small>of ${mmss(d.dur)}</small>`);
        // the Tags step settles 214 confident matches shortly after the page opens
        txt(tagsCnt, num(tween(t, T1 + .6, T2 + .4, 779, 565, E.inOut)));
        const k = seg(t, T1, T2), busy = k > 0 && k < 1;
        txt(recentc, String(Math.round(E.inOut(k) * 12)));
        txt(act, busy ? `Analysing ${12 - Math.round(E.inOut(k) * 12)} new tracks` : 'Library up to date');
        fileEls.forEach((f, i) => { const kk = E.out(seg(t, T1 + .3 + i * .28, T1 + .8 + i * .28)); txt(f.c, num(f.base + Math.round(kk * f.add)));
          const glow = kk > 0 && kk < 1 ? 1 : Math.max(0, 1 - (t - (T1 + .8 + i * .28)) / .9) * (kk >= 1 ? 1 : 0);
          f.c.style.color = glow > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(glow * 100)}%, var(--text-3))` : ''; });
        spin.style.transform = `rotate(${t * 360}deg)`;
        spin.style.display = busy ? '' : 'none'; actico.style.display = busy ? 'none' : '';
      }
    };
  }

  /* ======================= 1 · ADD MUSIC ======================= */
  // Tracks dropped from outside the music folders open Solco's review: copy or move, where they go, the files,
  // then Copy 38 tracks. They land in Recently added, waiting for analysis.
  function addMusic(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 560; root.style.width = W + 'px'; root.style.height = H + 'px';
    const files = [['Neşe Karaböcek - Yali Yali (Todd Terje Edit).mp3', '13.6 MB'], ['02. Rare Pleasure - Let Me Down Easy (Disco Version).flac', '38.2 MB'], ['06. Inland Knights - Clean Doubt.flac', '27.9 MB'], ['10. Inland Knights - Talk About Soul.flac', '22.4 MB'], ['11. Inland Knights - Think About It.flac', '36.0 MB']];
    const bg = S.recent.slice(0, 12), cols = { wave: !o.cmp, style: false, nums: o.cmp ? [] : ['Energy', 'Drive'] };
    const DW = o.cmp ? 520 : 620;
    const card = (on, t, d) => `<div style="border:${on ? 1.5 : 1}px solid ${on ? 'var(--accent)' : 'var(--line-1)'};background:${on ? 'var(--accent-soft)' : 'var(--bg-1)'};border-radius:9px;padding:15px 14px 12px 15px"><div style="display:flex;gap:12px;align-items:center;font-weight:600;font-size:13.5px"><span class="radio ${on ? 'on' : ''}"></span>${t}</div><div class="dim" style="margin:3px 0 0 28px;font-size:12.5px;line-height:17px">${d}</div></div>`;
    root.innerHTML = `<div class="bgwin" style="position:absolute;inset:0;display:flex;background:var(--bg-main)">${o.cmp ? '' : sidebar({ sel: 'recent', recent: 0, steps: { 1: { c: '', s: 'done' }, 2: { c: '', s: 'done' } }, prepAside: '' })}
      <div class="main"><div class="lib-head"><span class="ttl">Recently added</span><span class="sub" data-k="sub">0 tracks</span><div class="search">${I('search', 's16')}<span class="ph">Search</span></div></div>
      <div class="table">${libHeadOf(cols)}<div class="rows">${bg.map(t => libRow({ ...t, bpm: NaN, k: '', f: '', e: null, dr: null }, { ...cols, attr: 'data-r' }).replace('<span class="tl">', '<span class="tl"><i class="wait"></i>')).join('')}</div></div></div></div>
      <div data-k="scrim" style="position:absolute;inset:0;background:rgba(0,0,0,.63)"></div>
      <div data-k="drag" style="position:absolute;left:0;top:0;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:var(--bg-3);border:1px solid var(--line-3);box-shadow:0 18px 50px rgba(0,0,0,.5);font-weight:550">${I('file-music', 's14 accent')} 38 files</div>
      <div data-k="dlg" style="position:absolute;left:${(W - DW) / 2}px;top:30px;width:${DW}px;background:var(--bg-main);border:1px solid var(--line-2);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden">
        <div style="padding:22px 24px 0"><div class="ttl-f" style="font-size:22px;line-height:28px">Add 38 tracks to your library</div>
          <div class="dim" style="margin-top:8px;font-size:12.5px">From <span class="mono" style="color:var(--text-1)">~/Downloads/Bandcamp</span> · 1.9 GB · 16 FLAC, 22 other. These files are outside your music folders.</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 24px 0"><div data-k="opt1">${card(true, 'Copy into Music', 'Originals stay where they are. Uses 1.9 GB more space.')}</div>${card(false, 'Move into Music', 'The files leave where they are. Nothing is duplicated.')}</div>
        <div style="padding:16px 24px 0;display:flex;gap:10px;align-items:center;font-size:12.5px"><span class="dim">Into</span><span class="mono">~/Music</span></div>
        <div style="margin:12px 24px 0;border:1px solid var(--line-1);border-radius:8px;background:var(--bg-1);padding:8px 14px">
          ${files.map(([f, z]) => `<div data-f style="height:24px;display:flex;align-items:center;gap:8px;font-size:12.5px">${I('audio-waveform', 's14 muted')}<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f)}</span><span class="muted tnum" style="font-size:12px">${z}</span></div>`).join('')}
          <div data-f style="height:24px;display:flex;align-items:center;padding-left:22px;font-size:12.5px" class="muted">and 33 more</div></div>
        <div style="padding:14px 24px 0;display:flex;gap:9px;align-items:center;font-size:13px"><span class="cbx on acc">${I('check')}</span>Always copy files dropped from Downloads</div>
        <div style="padding:8px 24px 18px;display:flex;gap:8px;align-items:center;font-size:12px" class="muted">${I('info', 's14')}<span>Analysis starts as soon as the files are in. You can keep working; it runs in the background.</span></div>
        <div style="display:flex;gap:10px;align-items:center;padding:14px 24px;border-top:1px solid var(--line-1)"><span class="muted" style="font-size:12px;flex:1">Esc to cancel</span><span class="btn lg">Cancel</span><span class="btn lg primary" data-k="go">Copy 38 tracks</span></div>
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
        setOp(scrim, seg(t, .7, 1.1) * (1 - seg(t, 2.8, 3.2)) * .9 + .1 * (1 - seg(t, 2.8, 3.2)));
        frows.forEach((r, i) => { const k = E.out(seg(t, .95 + i * .09, 1.35 + i * .09)); setOp(r, k); setT(r, `translateX(${(1 - k) * 10}px)`); });
        const pr = cur.render(t, Object.assign([{ t: 1.75, x: W * .62, y: 470 }, { t: 2.45, el: go, dx: -18, dy: 4 }], { hide: 2.9 }), [{ t: 2.55 }]);
        pressStyle(go, pr);
        brows.forEach((r, i) => { const k = E.out(seg(t, 3.05 + i * .04, 3.45 + i * .04)); setOp(r, k); setT(r, `translateY(${(1 - k) * 8}px)`); });
        const n = Math.round(tween(t, 3.05, 3.8, 0, 38, E.inOut));
        txt(sub, `${n} tracks`); if (rc) txt(rc, String(n));
      }
    };
  }

  /* ======================= 2 · ANALYSIS ======================= */
  // Recently added while Solco listens: a dot beside a title that waits, a turning ring while it is analysed,
  // then its waveform, tempo, key, feel and readings. The sidebar's Activity row says what runs.
  function analysis(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 580; root.style.width = W + 'px'; root.style.height = H + 'px';
    const d = S.deck;
    const rows = [{ t: d.title, a: d.artist, s: 'Disco', bpm: d.bpm, k: d.camelot, e: Math.round(d.energy), dr: Math.round(d.arousal), f: d.feel, _w: d.overview, lufs: d.lufs }, ...S.recent.slice(1, 12)];
    const cols = { wave: !o.cmp, style: false, nums: o.cmp ? ['Energy'] : ['Energy', 'Drive'] };
    const start = i => .25 + Math.floor(i / 4) * 1.55 + (i % 4) * .22, LEN = 1.45;
    root.innerHTML = `<div style="position:absolute;inset:0;display:flex;background:var(--bg-main)">${o.cmp ? '' : sidebar({ sel: 'recent', recent: 38, steps: { 1: { c: '38', s: 'next' }, 2: { c: '', s: 'done' } }, act: 'Analysing 38 tracks' })}
      <div class="main"><div class="lib-head"><span class="ttl">Recently added</span><span class="sub">38 tracks</span><div class="search">${I('search', 's16')}<span class="ph">Search 38 tracks</span></div></div>
      <div class="table">${libHeadOf(cols)}<div class="rows">${rows.map(t => libRow(t, { ...cols, attr: 'data-r' }).replace('<span class="tl">', '<span class="tl"><span data-st></span>')).join('')}</div></div></div></div>`;
    const R = $$(root, '[data-r]').map((r, i) => ({ st: $(r, '[data-st]'), v: $$(r, '[data-v]'), cv: $(r, '[data-wave]'), row: rows[i] }));
    const act = $(root, '[data-k=act]'), spin = $(root, '[data-k=spin]'), actico = $(root, '[data-k=actico]'), cnt = $(root, '[data-step="1"] .cnt');
    let painted = false;
    return {
      dur: 7.4, still: 7.3,
      render(t) {
        if (!painted) { painted = true; R.forEach(r => r.cv && window.UI.paintPreview(r.cv, r.row)); }
        let done = 0;
        R.forEach((r, i) => {
          const s = start(i), k = seg(t, s, s + LEN), fin = t >= s + LEN;
          if (fin) done++;
          const vk = E.out(seg(t, s + LEN, s + LEN + .35));
          r.v.forEach((v, j) => setOp(v, E.out(seg(t, s + LEN + j * .04, s + LEN + .35 + j * .04))));
          if (r.cv) setOp(r.cv, E.out(seg(t, s + .3, s + .8)));
          r.st.innerHTML = fin ? '' : k > 0 ? `<span class="spin" style="width:12px;height:12px;transform:rotate(${t * 400}deg)"></span>` : '<i class="wait"></i>';
        });
        if (act) { txt(act, `Analysing ${38 - done} tracks`); spin.style.transform = `rotate(${t * 360}deg)`; actico.style.display = 'none'; txt(cnt, String(38 - done)); }
      }
    };
  }

  /* ======================= 3 · DUPLICATES ======================= */
  // The Duplicates page (Solco ADR 0172): each recording held in more than one place, Keep on one copy and
  // Remove on the others; removing goes through a review that lists every file before it moves to the trash.
  function duplicates(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 540; root.style.width = W + 'px'; root.style.height = H + 'px';
    const G = [
      { t: 'Whistle Me (Fouk remix)', a: 'Elisa Elisa', ev: 'same recording, by fingerprint', keep: ['Music', 'Compilations/The Round Up Pt. 11/01 Whistle Me (Fouk remix).m4a', 'AAC 256', '5:21', '10.7 MB', 'main folder'], rm: [['Downloads', 'Beatport/Elisa Elisa - Whistle Me (Fouk Remix).mp3', 'MP3 320', '5:21', '12.2 MB', 'folder 2'], ['Downloads', 'Bandcamp/Elisa Elisa - Whistle Me (Fouk remix).mp3', 'MP3 320', '5:21', '12.0 MB', 'folder 2']] },
      { t: 'Freak n Freeze', a: 'Bill Deal', ev: 'same recording, by fingerprint', keep: ['Music', 'Compilations/Selectors 001 - Motor City Drum Ensemble/08 Freak n Freeze.m4a', 'AAC 256', '4:08', '8.4 MB', 'main folder'], rm: [['Downloads', 'Selectors 001 - Motor City Drum Ensemble/03 Freak n Freeze.mp3', 'MP3 320', '4:09', '9.5 MB', 'folder 2']] },
      { t: "Don't Mess With The Devil", a: 'Raphael Green', ev: 'identical audio', keep: ['Music', "Compilations/Selectors 001 - Motor City Drum Ensemble/06 Don't Mess With The Devil.m4a", 'AAC 256', '4:13', '9.2 MB', 'main folder'], rm: [['Downloads', "Selectors 001 - Motor City Drum Ensemble/05 Don't Mess With The Devil.mp3", 'MP3 320', '4:13', '9.7 MB', 'folder 2'], ['Downloads', "Bandcamp/Raphael Green - Don't Mess With The Devil.mp3", 'MP3 320', '4:13', '9.5 MB', 'folder 2']] },
    ];
    const cp = (c, keep) => `<div class="copy ${keep ? '' : 'rm'}" ${keep ? 'data-keep' : 'data-rm'} style="height:28px;padding-left:24px"><span class="radio ${keep ? 'on' : ''}"></span><span class="tagk ${keep ? 'keep' : 'rm'}">${keep ? 'KEEP' : 'REMOVE'}</span><span class="p"><b>${c[0]}</b>/${esc(c[1])}</span>${o.cmp ? '' : `<span class="m dim">${c[2]}</span><span class="m tnum dim" style="width:38px;text-align:right">${c[3]}</span><span class="m tnum dim" style="width:60px;text-align:right">${c[4]}</span>`}<span class="m" style="width:${o.cmp ? 80 : 90}px;text-align:right;padding-right:20px">${c[5]}</span></div>`;
    root.innerHTML = `<div style="position:absolute;inset:0;background:var(--bg-main)"></div><div style="position:relative;height:100%;display:flex;flex-direction:column">
      <div class="vhead" style="gap:14px"><div class="ttl" style="font-size:24px">Duplicates</div><div class="sub tnum" data-k="sub" style="font-size:12.5px;margin-top:3px">3 recordings in more than one place · 5 extra copies · 53.3 MB</div><span style="flex:1"></span>${o.cmp ? '' : `<span class="dim" data-k="keepall" style="display:flex;gap:6px;align-items:center">${I('check', 's14')}Keep all as they are</span>`}<span class="btn danger-o" data-k="rmall">${I('trash-2', 's14')}Remove 5 copies…</span></div>
      <div data-k="list"><div style="margin:0 20px 4px 24px;padding:10px 14px;border-radius:8px;background:var(--bg-1);border:1px solid var(--line-1);color:var(--text-2);display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:17px">${I('info', 's14 muted')}<span>Solco keeps the copy in your main library folder, Music. Copies you remove go to the system trash after you confirm; playlists, cues and grid edits move to the kept copy when the audio matches.</span></div>
      ${G.map(g => `<div style="padding:10px 0 6px;border-bottom:1px solid var(--line-1)" data-g><div style="height:24px;display:flex;align-items:center;gap:8px;padding:0 20px 0 24px"><span style="font-weight:600">${esc(g.t)}</span><span class="dim">${esc(g.a)}</span><span class="muted" style="font-size:12px">· ${g.ev}</span><span style="flex:1"></span><span class="dim" style="font-size:12.5px">Not duplicates</span></div>${cp(g.keep, 1)}${g.rm.map(r => cp(r, 0)).join('')}</div>`).join('')}</div>
      <div data-k="none" style="text-align:center;padding-top:60px"><div style="font-weight:600;font-size:17px">No duplicates</div><div class="dim" style="margin-top:4px">Every recording is in one place.</div></div></div>
      <div data-k="scrim" style="position:absolute;inset:0;background:rgba(0,0,0,.63)"></div>
      <div data-k="dlg" style="position:absolute;left:${(W - (o.cmp ? 520 : 560)) / 2}px;top:80px;width:${o.cmp ? 520 : 560}px;background:var(--bg-main);border:1px solid var(--line-2);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden">
        <div style="padding:20px 22px 4px"><div class="ttl-f" style="font-size:22px">Move 5 copies to the trash?</div><div class="dim" style="margin-top:6px">Restoring a file from the trash does not bring back its cues or playlist entries.</div></div>
        <div class="dim" style="padding:10px 22px 0;display:flex;gap:6px;align-items:center;font-size:12.5px">${I('chevron-down', 's12')}Show the 5 files</div>
        <div style="margin:8px 22px 0;border:1px solid var(--line-1);border-radius:8px;background:var(--bg-1);padding:6px 0">${G.flatMap(g => g.rm).map(r => `<div style="height:24px;display:flex;align-items:center;gap:8px;padding:0 12px" class="mono"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-2)"><b style="font-weight:500;color:var(--text-1)">${r[0]}</b>/${esc(r[1])}</span></div>`).join('')}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;margin-top:16px;border-top:1px solid var(--line-1)"><span class="btn lg">Cancel</span><span class="btn lg" data-k="confirm" style="background:var(--danger);border-color:var(--danger);color:#fff;font-weight:600">${I('trash-2', 's14')}Move to trash</span></div></div>`;
    const rms = $$(root, '[data-rm]'), keeps = $$(root, '[data-keep]');
    const dlg = $(root, '[data-k=dlg]'), scrim = $(root, '[data-k=scrim]'), rmall = $(root, '[data-k=rmall]'), confirm = $(root, '[data-k=confirm]'), sub = $(root, '[data-k=sub]'), list = $(root, '[data-k=list]'), none = $(root, '[data-k=none]'), keepall = $(root, '[data-k=keepall]');
    const cur = cursorLayer(root);
    return {
      dur: 5.6, still: 2.5,
      render(t) {
        const gs = $$(root, '[data-g]'); gs.forEach((g, i) => { const k = E.out(seg(t, .05 + i * .12, .5 + i * .12)); setOp(g, k); setT(g, `translateY(${(1 - k) * 10}px)`); });
        const din = E.out5(seg(t, 1.75, 2.1)), dout = E.in(seg(t, 3.2, 3.45));
        setOp(dlg, din * (1 - dout)); setT(dlg, `translateY(${(1 - din) * 14}px) scale(${.97 + din * .03})`); setOp(scrim, din * (1 - dout));
        const pr = cur.render(t, Object.assign([{ t: .9, x: W * .55, y: 300 }, { t: 1.5, el: rmall, dx: -20 }, { t: 2.45, el: rmall, dx: -20 }, { t: 3.0, el: confirm, dx: -10, arc: -30 }], { hide: 3.4 }), [{ t: 1.6 }, { t: 3.1 }]);
        pressStyle(rmall, t < 2 ? pr : 0); pressStyle(confirm, t > 2.6 ? pr : 0);
        rms.forEach((r, i) => { const k = E.inOut(seg(t, 3.5 + i * .12, 3.95 + i * .12)); r.style.height = (28 * (1 - k)) + 'px'; setOp(r, 1 - E.out(seg(t, 3.5 + i * .12, 3.75 + i * .12))); });
        // once every extra copy has gone, the page says so
        const gone = E.out(seg(t, 4.3, 4.7)); setOp(list, 1 - gone); list.style.display = gone >= 1 ? 'none' : '';
        none.style.display = gone > 0 ? '' : 'none'; setOp(none, E.out(seg(t, 4.6, 5.0)));
        setOp(sub, 1 - gone); setOp(rmall, 1 - gone); if (keepall) setOp(keepall, 1 - gone);
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
          <span class="btn sq">${I('more-horizontal', 's16')}</span><span style="display:inline-flex"><span class="btn primary" data-k="apply" style="min-width:176px;border-radius:5px 0 0 5px">${I('check', 's14')}<span data-k="applyl">Apply 214 confident</span></span><span class="btn primary" data-k="caret" style="width:26px;padding:0;border-radius:0 5px 5px 0;margin-left:1px">${I('chevron-down', 's12')}</span></span></div>
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
        txt(applyl, applied === 0 ? 'Apply 214 confident' : applied < 214 ? 'Applying…' : 'Apply confident');
        for (const b of [apply, $(root, '[data-k=caret]')]) { b.style.background = applied >= 214 ? 'var(--bg-3)' : ''; b.style.color = applied >= 214 ? 'var(--text-3)' : ''; b.style.borderColor = applied >= 214 ? 'var(--line-2)' : ''; }
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
    // each column is [rms, lows, mids, highs], a fraction of full scale, as Solco stores it
    const nz = cols(b).map(r => r.map(x => x / 255)), no = cols(o).map(r => r.map(x => x / 255));
    g._z = nz;
    g._d = { title: g.title + '#ov', overview: no, dur: g.dur, downbeats: g.down, lufs: g.lufs };
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
          txt(conf, `How sure Solco is · ${Math.round(g.confidence * 100)}%`);
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
        cx.fillStyle = cs.getPropertyValue('--ok'); cx.fillRect(TW / 2 - dpr, 0, 2 * dpr, TH);
        // readout: the tempo under the playhead
        let cur = vis[0]; for (const b of vis) if (b[0] <= at) cur = b;
        if (g.regime === 'steady') { txt(bpm, g.bpm.toFixed(2)); txt(bpmk, 'BPM'); } else { txt(bpm, cur ? cur[2].toFixed(1) : ''); txt(bpmk, 'BPM right now'); }
      }
    };
    return api;
  }

  /* ======================= GENRE: heard, not read ======================= */
  // On the Tags page, the ⋯ menu's Suggest genre from style puts the style Solco hears in as each selected
  // track's proposed genre; nothing is written until Apply (Solco's catalog queue).
  function genre(root, o = {}) {
    const W = o.cmp ? 560 : 1040, H = 470; root.style.width = W + 'px'; root.style.height = H + 'px';
    const rows = S.genre, n = rows.filter(r => !(r.g && r.g.toLowerCase() === r.st[0].toLowerCase())).length;
    root.innerHTML = `<div style="position:absolute;inset:0;background:var(--bg-main)"></div><div style="position:relative">
      <div class="vhead"><div class="ttl" style="font-size:24px">Tags</div><div class="sub tnum" style="font-size:12.5px;margin-top:3px">${rows.length} tracks selected</div><span style="flex:1"></span>
        ${o.cmp ? '' : `<span class="btn">${I('search', 's14')}Find tags ${I('chevron-down', 's12 muted')}</span>`}<span class="btn sq" data-k="more">${I('more-horizontal', 's16')}</span></div>
      <div class="ghead"><div class="c c-title" style="padding-left:24px">Title</div>${o.cmp ? '' : '<div class="c c-artist" style="width:170px">Artist</div>'}<div class="c" style="width:${o.cmp ? 118 : 150}px">Genre tag</div><div class="c" style="width:${o.cmp ? 150 : 270}px">Style Solco hears</div>${o.cmp ? '' : '<div class="c" style="width:110px">Would change</div>'}</div>
      <div class="rows">${rows.map(r => { const same = r.g && r.g.toLowerCase() === r.st[0].toLowerCase();
        return `<div class="row sel2" data-r data-same="${same ? 1 : 0}" style="height:34px"><div class="c c-title" style="padding-left:24px">${esc(r.t)}</div>${o.cmp ? '' : `<div class="c c-artist" style="width:170px">${esc(r.a)}</div>`}
        <div class="c" style="width:${o.cmp ? 118 : 150}px;position:relative"><span data-old class="${r.g ? '' : 'muted'}">${r.g ? `<s>${esc(r.g)}</s>` : 'empty'}</span><span data-new style="position:absolute;left:8px;top:50%;transform:translateY(-50%)"><mark class="gmark">${esc(r.st[0])}</mark></span></div>
        <div class="c" style="width:${o.cmp ? 150 : 270}px;display:flex;gap:6px;align-items:center">${r.st.slice(0, o.cmp ? 1 : 3).map((s, i) => `<span class="chip ${i ? '' : 'acc'}">${i ? esc(s) : `<b>${esc(s)}</b>`}</span>`).join('')}</div>
        ${o.cmp ? '' : `<div class="c dim" style="width:110px;font-size:12.5px" data-chg>${same ? 'Already right' : 'Genre'}</div>`}</div>`; }).join('')}</div></div>
      <div class="menu" data-k="menu" style="position:absolute;right:20px;top:52px;width:280px">
        <div class="mh"><b>${rows.length} tracks selected</b><span>of 1,378</span></div>
        <div class="mi" data-k="apply">${I('check', 's14')}<span data-k="applyl">Apply ${rows.length} tracks</span><i>Ctrl+↵</i></div>
        <div class="mi">${I('x', 's14')}<span>Skip ${rows.length} tracks</span></div><div class="msep"></div>
        <div class="mi">${I('search', 's14')}<span>Look up again</span></div>
        <div class="mi" data-k="suggest">${I('sparkle', 's14')}<span>Suggest genre from style</span></div></div>
      <div class="toast" data-k="toast"><span class="ok">${I('circle-check', 's18')}</span><span><b style="font-weight:600">${n} genre tags written.</b> <span class="dim">Through a checked copy of each file.</span></span></div>`;
    const R = $$(root, '[data-r]').map(r => ({ el: r, same: r.dataset.same === '1', old: $(r, '[data-old]'), s: $(r, 's'), nw: $(r, '[data-new]'), chg: $(r, '[data-chg]') }));
    const more = $(root, '[data-k=more]'), menu = $(root, '[data-k=menu]'), suggest = $(root, '[data-k=suggest]'), apply = $(root, '[data-k=apply]'), toast = $(root, '[data-k=toast]');
    const cur = cursorLayer(root); const T1 = 1.3, T2 = 3.6;
    return {
      dur: T2 + 2.6, still: T2 + 2.5,
      render(t) {
        // the menu opens twice: first to suggest, then to apply
        const open = (t > T1 - .7 && t < T1 + .25) || (t > T2 - .7 && t < T2 + .25);
        menu.style.display = open ? '' : 'none'; setOp(menu, open ? 1 : 0);
        const pr = cur.render(t, Object.assign([{ t: .3, x: W * .55, y: 300 }, { t: T1 - .85, el: more }, { t: T1 - .1, el: suggest, dx: -40 }, { t: T2 - .85, el: more }, { t: T2 - .1, el: apply, dx: -40 }], { hide: T2 + .8 }), [{ t: T1 - .75 }, { t: T1 }, { t: T2 - .75 }, { t: T2 }]);
        pressStyle(more, (t > T1 - 1 && t < T1 - .5) || (t > T2 - 1 && t < T2 - .5) ? pr : 0);
        R.forEach((r, i) => {
          const w = T1 + .25 + i * .08, kw = E.out(seg(t, w, w + .35));
          if (r.same) { setOp(r.nw, 0); r.old.style.color = kw > .5 ? 'var(--ok)' : ''; }
          else { if (r.s) r.s.style.setProperty('--strike', kw * 100 + '%'); setOp(r.nw, E.out(seg(t, w + .2, w + .5))); setT(r.nw, `translate(${(1 - E.out(seg(t, w + .2, w + .5))) * 8}px,-50%)`);
            const wr = E.out(seg(t, T2 + .25 + i * .08, T2 + .6 + i * .08)); setOp(r.old, 1 - Math.max(E.out(seg(t, w + .25, w + .5)), 0)); }
          if (r.chg) { txt(r.chg, t > T2 + .25 + i * .08 ? (r.same ? 'Already right' : 'Tagged') : t > w ? (r.same ? 'Already right' : 'Genre') : ''); r.chg.style.color = t > T2 + .25 + i * .08 && !r.same ? 'var(--ok)' : ''; }
        });
        const tk = E.out5(seg(t, T2 + 1.2, T2 + 1.6)); setOp(toast, tk); setT(toast, `translate(-50%, ${(1 - tk) * 14}px)`);
      }
    };
  }

  /* ======================= 6 · PLAYLISTS ======================= */
  // Left, the search: each rule typed becomes a chip and the table narrows; the button at the end of the field
  // saves it as a smart playlist. Right, the assistant: it plans a folder for the night, then changes one of
  // the playlists when asked, for review before anything is changed (Solco ADRs 0246, 0248, 0264).
  function playlists(root, o = {}) {
    const W = o.cmp ? 560 : 1100, H = 520; root.style.width = W + 'px'; root.style.height = H + 'px';
    const all = S.pool;
    const st1 = all.filter(t => t.bpm >= 120 && t.bpm < 125).sort((a, b) => a.bpm - b.bpm);
    const st2 = st1.filter(t => t.k === '8A'); const st3 = st2.filter(t => t.e >= 60);
    const stages = [{ rows: all.slice(0, 14), count: '9,440 tracks' }, { rows: st1.slice(0, 14), count: '1,204 tracks' }, { rows: st2, count: '96 tracks' }, { rows: st3, count: `${st3.length} tracks` }];
    const typed = [['bpm:120..124', 'BPM', '120..124'], ['key:8A', 'Key', '8A'], ['energy:>=60', 'Energy', '>=60']];
    const T = [[.4, 1.25, 1.35], [1.75, 2.2, 2.3], [2.7, 3.35, 3.45]]; // type start, type end, chip
    const PW = 400;
    const cols = { wave: !o.cmp, style: !o.cmp, nums: ['Energy'] };
    // The plan: four parts in playing order, each sized for 45 minutes (Solco ADR 0246).
    const PLAN = [{ n: 'DN 1 · Warm & Funky', b: [100, 118], e: [55, 60], c: 14 }, { n: 'DN 2 · Groove In', b: [112, 122], e: [57, 64], c: 15 },
      { n: 'DN 3 · The Build', b: [118, 126], e: [64, 70], c: 16 }, { n: 'DN 4 · Peak Disco', b: [122, 128], e: [71, 90], c: 14 }];
    const REV = [['Glow in the Dark', 'Buckethead', ''], ['Kamp Krusty', 'Dreems', 'new'], ['Solar Flares (Emma de Seze remix)', 'Emma de Seze, Avanti', ''], ['Mysteries of the World', 'MFSB', 'moved']];
    root.innerHTML = `<div style="display:flex;height:100%;background:var(--bg-main)"><section style="flex:1;min-width:0;display:flex;flex-direction:column">
      <div class="lib-head"><span class="ttl">All tracks</span><span class="sub tnum" data-k="count">9,440 tracks</span>
        <div class="search focus" data-k="search">${I('search', 's16')}<span data-k="chips" style="display:flex;gap:6px"></span><span class="typing" data-k="typing"></span><span class="caret" data-k="caret"></span><span style="flex:1"></span>${I('list-sparkles', 's16 dim')}</div></div>
      <div class="table">${libHeadOf(cols)}<div style="position:relative;height:100%">${stages.map(st => `<div class="rows" data-stage style="position:absolute;inset:0">${st.rows.map(t => libRow(t, cols)).join('')}</div>`).join('')}</div></div>
      </section>
      ${o.cmp ? '' : `<aside class="asst" style="width:${PW}px;flex:none"><div class="phead"><span class="accent">${I('sparkle', 's18')}</span><span class="ttl">Assistant</span><span class="iconbtn">${I('plus')}</span><span class="iconbtn">${I('x')}</span></div>
        <div class="feed"><div data-k="g1" style="display:flex;flex-direction:column;gap:10px">
          <div class="msg-u" data-k="u1" style="align-self:flex-end">I'm opening a disco night, 22:00 to 01:00. Start warm and funky, build to peak disco.</div>
          <div class="msg-a" data-k="a1">Four parts, ${PLAN.reduce((n, p) => n + p.c, 0)} tracks for three hours, climbing from 100 to 128 BPM. The folder is <b style="font-weight:600">Disco Night · 22–01</b>.</div>
          <div data-k="cards" style="display:flex;flex-direction:column;gap:6px">${PLAN.map(p => `<div class="pcard" data-pl><div class="h"><span class="cbx acc on">${I('check')}</span><b>${esc(p.n)}</b><span class="tnum">${p.c} tracks</span></div><div class="d tnum" style="padding-left:24px">Part · ${p.b[0]} to ${p.b[1]} BPM · energy ${p.e[0]} to ${p.e[1]}</div></div>`).join('')}</div>
          <div style="display:flex;justify-content:flex-end"><span class="btn primary" data-k="create">${I('folder-plus', 's14')}Create folder · 4 playlists</span><span class="muted" data-k="created" style="font-size:12.5px;line-height:17px;display:none">Created the folder Disco Night · 22–01 under Playlists. Nothing else was changed.</span></div></div>
          <div data-k="g2" style="display:flex;flex-direction:column;gap:10px">
          <div class="msg-u" data-k="u2" style="align-self:flex-end">Make DN 2 build more slowly</div>
          <div class="msg-a" data-k="a2">It now holds the warmer tracks longer and climbs from energy 55 to 66.</div>
          <div class="pcard" data-k="rev" style="gap:3px"><span class="muted" style="font-size:11.5px">Playlist</span><b style="font-weight:600;font-size:15px">DN 2 · Groove In</b>
            <span class="dim tnum" style="font-size:12.5px">15 → 14 tracks · 46:10 → 44:52</span><span class="muted tnum" style="font-size:12.5px">2 added · 3 removed · 1 moved</span>
            <span class="muted" style="font-size:11.5px;margin-top:4px">New order</span>${REV.map(([t, a, tag]) => `<div class="chg"><span>${esc(a)} - ${esc(t)}</span><i style="color:${tag === 'new' ? 'var(--accent)' : 'var(--text-2)'}">${tag}</i></div>`).join('')}
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px" data-k="revbtns"><span class="btn">Save as new</span><span class="btn primary" data-k="update">${I('check', 's14')}Update playlist</span></div>
            <span class="muted" data-k="updated" style="font-size:12.5px;line-height:17px;display:none;margin-top:6px">Updated DN 2 · Groove In. Nothing else was changed.</span></div></div>
        </div>
        <div class="composer"><span class="muted" style="flex:1">Describe the gig, or change a playlist…</span><span class="send">${I('arrow-right', 's14')}</span></div>
        <div class="share tnum"><span data-k="shared">Solco · 0 of 9,440 tracks shared</span><br>Solco receives your request, the conversation, and the names and details of the tracks and playlists it looks up, never audio or file paths.</div></aside>`}</div>`;
    const chipsEl = $(root, '[data-k=chips]'), typing = $(root, '[data-k=typing]'), caret = $(root, '[data-k=caret]'), count = $(root, '[data-k=count]');
    chipsEl.innerHTML = typed.map(([, k, v]) => `<span class="chip acc" data-chip><span>${k}</span><b>${v}</b></span>`).join('');
    const chips = $$(chipsEl, '[data-chip]'), stageEls = $$(root, '[data-stage]');
    stageEls.forEach((el, i) => paintRows(el, stages[i].rows));
    const g1 = $(root, '[data-k=g1]'), g2 = $(root, '[data-k=g2]'), u1 = $(root, '[data-k=u1]'), a1 = $(root, '[data-k=a1]'), pls = $$(root, '[data-pl]');
    const create = $(root, '[data-k=create]'), created = $(root, '[data-k=created]'), shared = $(root, '[data-k=shared]');
    const u2 = $(root, '[data-k=u2]'), a2 = $(root, '[data-k=a2]'), rev = $(root, '[data-k=rev]'), update = $(root, '[data-k=update]'), revbtns = $(root, '[data-k=revbtns]'), updated = $(root, '[data-k=updated]');
    const cur = o.cmp ? null : cursorLayer(root);
    const TA = 4.0, TC = TA + 2.7, TR = TC + 1.1, TU = TR + 2.9;
    return {
      dur: o.cmp ? 4.4 : TU + 1.4, still: o.cmp ? 4.3 : TU + 1.3,
      render(t) {
        let text = '', stage = 0;
        typed.forEach(([s], i) => { const [a, b, c] = T[i];
          if (t >= c) stage = i + 1;
          const ck = E.out5(seg(t, c, c + .3)); chips[i].style.display = t >= c ? '' : 'none'; setOp(chips[i], ck); setT(chips[i], `scale(${.85 + .15 * ck})`);
          if (t >= a && t < c) text = s.slice(0, Math.round(seg(t, a, b) * s.length)); });
        txt(typing, text); caret.style.opacity = (t > 3.6 && Math.floor(t * 2) % 2) ? 0 : 1;
        txt(count, stages[stage].count);
        stageEls.forEach((el, i) => { const sIn = i === 0 ? -1 : T[i - 1][2]; const sOut = i < 3 ? T[i][2] : 1e9;
          const kin = i === 0 ? 1 : E.out(seg(t, sIn, sIn + .35)), kout = E.out(seg(t, sOut, sOut + .2));
          setOp(el, kin * (1 - kout)); setT(el, `translateY(${(1 - kin) * 8}px)`); });
        if (!u1) return;
        const k1 = E.out(seg(t, TA, TA + .4)); setOp(u1, k1); setT(u1, `translateY(${(1 - k1) * 10}px)`);
        const k2 = E.out(seg(t, TA + .7, TA + 1.1)); setOp(a1, k2); setT(a1, `translateY(${(1 - k2) * 8}px)`);
        pls.forEach((p, i) => { const k = E.out(seg(t, TA + 1.3 + i * .12, TA + 1.7 + i * .12)); setOp(p, k); setT(p, `translateY(${(1 - k) * 8}px)`); });
        setOp(create.parentNode, E.out(seg(t, TA + 1.8, TA + 2.1)));
        // the conversation shares the rows of the tracks and playlists the assistant looked up
        const n = t < TA + .4 ? 0 : Math.round(tween(t, TA + .4, TA + 1.3, 0, 112, E.inOut)) + Math.round(tween(t, TR + .4, TR + 1.0, 0, 15, E.inOut));
        txt(shared, `Solco · ${n} of 9,440 tracks shared`);
        const done = t > TC + .25; create.style.display = done ? 'none' : ''; created.style.display = done ? '' : 'none';
        setOp(created, E.out(seg(t, TC + .25, TC + .6)));
        // then the DJ asks for a change to one playlist, and reviews it
        const show2 = t >= TR; g2.style.display = show2 ? 'flex' : 'none';
        const up = E.inOut(seg(t, TR, TR + .6)); setOp(g1, 1 - up); g1.style.display = up >= 1 ? 'none' : 'flex';
        const ku = E.out(seg(t, TR, TR + .4)); setOp(u2, ku); setT(u2, `translateY(${(1 - ku) * 10}px)`);
        const ka = E.out(seg(t, TR + .7, TR + 1.1)); setOp(a2, ka); setT(a2, `translateY(${(1 - ka) * 8}px)`);
        const kr = E.out5(seg(t, TR + 1.3, TR + 1.8)); setOp(rev, kr); setT(rev, `translateY(${(1 - kr) * 12}px)`);
        const pr = cur.render(t, Object.assign([{ t: TA + 1.9, x: W - PW / 2, y: 140 }, { t: TC - .15, el: create, dx: -30, dy: 2 }, { t: TR + 1.9, x: W - PW / 2, y: 300, arc: -10 }, { t: TU - .15, el: update, dx: -20, dy: 2 }], { hide: TU + .8 }), [{ t: TC }, { t: TU }]);
        pressStyle(create, t < TC + .3 ? pr : 0); pressStyle(update, t > TC + .3 ? pr : 0);
        const ud = t > TU + .25; revbtns.style.display = ud ? 'none' : 'flex'; updated.style.display = ud ? '' : 'none'; setOp(updated, E.out(seg(t, TU + .25, TU + .6)));
      }
    };
  }

  /* ======================= 7 · EXPORT ======================= */
  // The Export page as Solco draws it: what to export, the plan in plain words, the drive and its space, and
  // the Ready card that becomes Exporting, then Exported (Solco ADRs 0227, 0232, 0238).
  function exportDemo(root, o = {}) {
    const W = o.cmp ? 560 : 1100, H = 560; root.style.width = W + 'px'; root.style.height = H + 'px';
    const pls = [['Disco Night · 22–01', 4, 1], ['DN 1 · Warm & Funky', 14, 2], ['DN 2 · Groove In', 14, 2], ['DN 3 · The Build', 16, 2], ['DN 4 · Peak Disco', 14, 2], ['Deep House', 991, 0]];
    const GB = 64.0, other = 4.8, solco = 16.4, add = 0.6;
    const opt = (on, t, d) => `<div style="border:1px solid ${on ? 'var(--accent)' : 'var(--line-2)'};${on ? 'box-shadow:inset 0 0 0 1px var(--accent);background:var(--accent-soft);' : 'background:var(--bg-1);'}border-radius:10px;padding:12px 14px"><div style="display:flex;gap:10px;align-items:center;font-weight:600;font-size:13.5px"><span class="radio ${on ? 'on' : ''}"></span>${t}</div><div class="dim" style="margin:3px 0 0 26px;font-size:12.5px;line-height:17px">${d}</div></div>`;
    const planRow = (sym, n, words, size) => `<div style="display:flex;align-items:center;gap:12px;height:26px"><span class="accent" style="width:12px;text-align:center">${sym}</span><span style="flex:1"><b style="font-weight:600">${n}</b><span class="dim">${words}</span></span>${size ? `<span class="muted tnum">${size}</span>` : ''}</div>`;
    root.innerHTML = `<div style="display:flex;height:100%;gap:20px;padding:0 20px 0 24px;background:var(--bg-main)">
      <section style="flex:1;min-width:0;display:flex;flex-direction:column">
        <div class="vhead" style="padding:0;gap:16px"><div class="ttl">Export</div><div class="ttl muted" style="color:var(--text-4)">Import</div>${o.cmp ? '' : '<div class="sub">Prepare a Pioneer USB drive for the club</div>'}</div>
        <div class="lbl11" style="margin:2px 0 10px">What to export</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${opt(false, 'Everything', 'All 9,440 tracks and 66 playlists, with cues, grids and artwork.')}${opt(true, 'Chosen playlists', '5 of 66 ticked, and the tracks in them.')}</div>
        <div style="margin-top:10px;border:1px solid var(--line-1);border-radius:10px;padding:4px 0;background:var(--bg-1)">
          ${pls.map(([n, c, lv]) => `<div style="height:28px;display:flex;align-items:center;gap:10px;padding:0 14px 0 ${lv === 2 ? 40 : 14}px"><span class="cbx" data-cb="${lv}">${I('check')}</span>${I(lv === 0 ? 'list-sparkles' : lv === 2 ? 'list-music' : 'folder', 's14 dim')}<span style="flex:1">${esc(n)}</span><span class="muted tnum" style="font-size:12.5px">${num(c)}</span></div>`).join('')}</div>
        <div style="margin-top:10px;border:1px solid var(--line-1);border-radius:10px;padding:8px 16px;background:var(--bg-1)" data-k="plan">
          ${planRow('+', 41, ' tracks are copied to FRIDAY', '0.6 GB')}${planRow('=', 18, ' tracks are already on FRIDAY and stay as they are')}${planRow('~', 5, ' playlists written, in 1 folder')}</div>
        <div class="dim" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:12.5px;line-height:18px">${I('info', 's14 muted')}<span>Export only adds and updates. Nothing on the drive is removed, so tracks you put there from another computer stay.</span></div>
      </section>
      ${o.cmp ? '' : `<aside style="width:400px;flex:none;display:flex;flex-direction:column;gap:12px">
        <div style="height:64px;display:flex;align-items:center;justify-content:flex-end;gap:14px"><span class="dim">Help</span><span class="seg"><span class="on">CDJ USB</span><span>Traktor</span><span>M3U8</span></span></div>
        <div class="card" style="padding:16px 18px;background:var(--bg-1)"><div style="display:flex;align-items:flex-start;gap:12px">${I('usb-drive', 's18 dim')}<div style="flex:1"><div style="font-weight:600;font-size:14px">FRIDAY</div><div class="muted" style="font-size:12.5px">SanDisk · Ultra · 64.0 GB · FAT32</div></div><span class="btn">${I('eject', 's14')}Eject</span></div>
          <div class="prog" style="margin-top:14px;height:6px;gap:0;background:var(--bg-4)"><i style="width:${other / GB * 100}%;background:var(--text-3)"></i><i style="width:${solco / GB * 100}%;background:var(--text-1)"></i><i data-k="addbar" style="width:0;background:var(--accent)"></i></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-top:12px;font-size:12.5px" class="dim"><span><i class="sw" style="background:var(--text-3)"></i>Other files 4.8 GB</span><span><i class="sw" style="background:var(--text-1)"></i>Solco 16.4 GB</span><span><i class="sw" style="background:var(--accent)"></i>This export 0.6 GB</span><span><i class="sw" style="background:var(--bg-4)"></i>Free after 42.2 GB</span></div></div>
        <div class="card" style="padding:16px 18px;position:relative;overflow:hidden;background:var(--bg-1)" data-k="ready">
          <div style="display:flex;align-items:baseline;gap:10px"><span class="ttl-f" style="font-size:22px" data-k="rt">Ready</span><span class="muted">CDJ and XDJ players</span></div>
          <div data-k="pre" style="margin-top:12px"><div>Nothing on FRIDAY has changed yet.</div><div class="dim">41 tracks to copy (0.6 GB)</div>
            <div class="btn primary lg" data-k="go" style="width:100%;margin-top:12px;height:40px">${I('usb-drive', 's14')}Export to FRIDAY</div>
            <div class="dim" style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12.5px">${I('circle-check', 's14')}Eject safely when it finishes</div></div>
          <div data-k="progwrap" style="margin-top:12px"><div style="display:flex;align-items:center;gap:10px"><span class="spin" data-k="spin" style="width:18px;height:18px;border-width:2px;border-color:var(--bg-4);border-top-color:var(--accent)"></span><span data-k="pl">Copying audio</span></div>
            <div class="prog" style="height:5px;margin-top:12px"><i data-k="prog" style="width:0;background:var(--accent)"></i></div><div class="muted tnum" style="margin-top:6px;font-size:12.5px" data-k="pc">0%</div></div>
          <div data-k="fin" style="margin-top:12px"><div style="display:flex;gap:8px;align-items:center"><span class="ok">${I('circle-check', 's14')}</span>41 tracks and 5 playlists on FRIDAY, every file checked</div>
            <div class="btn primary lg" style="width:100%;margin-top:12px;height:40px">${I('eject', 's14')}Eject FRIDAY</div><div class="dim" style="margin-top:10px">Export again</div></div>
        </div></aside>`}</div>`;
    const cbs = $$(root, '[data-cb]');
    const addbar = $(root, '[data-k=addbar]'), go = $(root, '[data-k=go]'), pre = $(root, '[data-k=pre]'), prog = $(root, '[data-k=prog]'), progwrap = $(root, '[data-k=progwrap]'), pc = $(root, '[data-k=pc]'), pl = $(root, '[data-k=pl]'), fin = $(root, '[data-k=fin]'), rt = $(root, '[data-k=rt]'), spin = $(root, '[data-k=spin]');
    const cur = cursorLayer(root);
    const TG = 2.0;
    return {
      dur: o.cmp ? 1.6 : 6.4, still: o.cmp ? 1.5 : 6.3,
      render(t) {
        cbs.forEach((c, i) => { const on = +c.dataset.cb > 0 && t > .3 + i * .14; c.className = 'cbx' + (on ? ' on acc' : ''); c.style.transform = on ? `scale(${1 + .15 * (1 - E.out(seg(t, .3 + i * .14, .55 + i * .14)))})` : ''; });
        if (!go) return;
        const plan = E.out(seg(t, .9, 1.3)), fill = seg(t, TG + .2, TG + 2.8);
        addbar.style.width = (add / GB * 100 * plan) + '%';
        const pr = cur.render(t, Object.assign([{ t: 1.0, x: 900, y: 470 }, { t: TG - .15, el: go, dx: -60, dy: 3 }], { hide: TG + .8 }), [{ t: TG }]);
        pressStyle(go, pr);
        const done = t > TG + 3.1;
        pre.style.display = t < TG + .15 ? '' : 'none';
        progwrap.style.display = t >= TG + .15 && !done ? '' : 'none';
        fin.style.display = done ? '' : 'none';
        prog.style.width = E.inOut(fill) * 100 + '%'; txt(pc, `${Math.round(E.inOut(fill) * 100)}%`);
        txt(pl, fill < .8 ? 'Copying audio' : 'Writing playlists, cues and grids');
        spin.style.transform = `rotate(${t * 400}deg)`;
        setOp(fin, E.out(seg(t, TG + 3.1, TG + 3.5)));
        txt(rt, done ? 'Exported' : t >= TG + .15 ? 'Exporting' : 'Ready');
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
