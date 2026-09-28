/* Page behaviour: build each live interface when it comes near, scale it to fit,
   play it once in view, follow the rail, run the download through Solco to the USB, and keep the
   waitlist working even when its script does not load. Respects reduced motion
   and the system's light or dark look. */
(function () {
  const doc = document.documentElement; doc.classList.add('js');
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = params.has('still') || reduce;
  window.__still = still;
  if (still) doc.classList.add('still');
  const lightMQ = matchMedia('(prefers-color-scheme: light)');
  const compact = () => innerWidth < 760;
  const REPLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
  // natural size of each interface, so space is reserved before it is built
  const SIZE = { hero: [1280, 800], addMusic: [1040, 560, 560], analysis: [1040, 580, 560], duplicates: [1040, 540, 560], tags: [1100, 620, 560],
    gridLab: [1040, 500, 560, 470], genre: [1040, 470, 560], playlists: [1100, 520, 560], exportDemo: [1100, 560, 560], player: [640, 400] };

  /* ---------- live interface stages ---------- */
  const stages = [...document.querySelectorAll('[data-demo]')].map(el => ({ el, name: el.dataset.demo, after: el.dataset.after, needs: el.dataset.needs, built: false, t0: null, t: 0, visible: false, done: false }));
  window.__stages = stages;
  const loaded = {};
  const need = name => loaded[name] || (loaded[name] = new Promise((ok, fail) => { const s = document.createElement('script'); s.src = `assets/js/${name}.js`; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }));
  const inWipe = s => !!s.el.closest('.wipe');
  const themeFor = s => s.el.dataset.theme ? s.el.dataset.theme === 'light' : lightMQ.matches;
  const cmpFor = s => compact() && s.name !== 'hero' && s.name !== 'player';

  function reserve(s) {
    if (s.built || inWipe(s)) return;
    const z = SIZE[s.name] || [1040, 560]; const c = cmpFor(s);
    const W = c && z[2] ? z[2] : z[0], H = c && z[3] ? z[3] : z[1];
    let k = Math.min(1, s.el.clientWidth / W); if (s.name === 'hero' && compact()) k = .62;
    s.el.style.height = Math.round(H * k) + 'px';
  }
  function build(s) {
    if (s.built || s.building) return;
    s.building = true;
    const go = () => {
      const root = document.createElement('div');
      root.className = 'ui' + (s.name === 'hero' ? ' win' : '') + (themeFor(s) ? ' light' : '');
      s.el.appendChild(root); s.root = root;
      s.demo = window.DEMOS[s.name](root, { cmp: cmpFor(s) });
      s.built = true;
      if (s.name !== 'hero' && s.name !== 'gridLab' && !still) {
        const b = document.createElement('button'); b.className = 'replay'; b.type = 'button'; b.setAttribute('aria-label', 'Play again'); b.innerHTML = REPLAY;
        b.addEventListener('click', () => { s.t0 = performance.now(); s.done = false; s.el.classList.remove('done'); });
        s.el.appendChild(b);
      }
      if (s.name === 'gridLab') wireTabs(s);
      layout(s); render(s, still ? s.demo.still : 0);
    };
    (s.needs ? need(s.needs) : Promise.resolve()).then(go, () => { s.building = false; });
  }
  function layout(s) {
    if (!s.built) return reserve(s);
    const W = s.root.offsetWidth, H = s.root.offsetHeight;
    let k = Math.min(1, s.el.clientWidth / W);
    if (s.name === 'hero' && compact()) k = .62; // the window bleeds off the right edge on phones
    if (inWipe(s)) { const wp = s.el.closest('.wipe'); k = compact() ? wp.clientHeight / H : wp.clientWidth / W; s.el.style.width = wp.clientWidth + 'px'; s.el.style.height = '100%'; }
    else s.el.style.height = Math.round(H * k) + 'px';
    s.root.style.transform = `scale(${k})`;
  }
  function render(s, t) { if (!s.built) return; s.t = t; s.demo.render(t); }
  const layoutAll = () => stages.forEach(layout);
  layoutAll();

  // build what is near, and everything else once the page is idle
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const s = stages.find(x => x.el === e.target); build(s); near.unobserve(e.target); } }), { rootMargin: '120% 0px' });
  stages.forEach(s => near.observe(s.el));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { stages.forEach(s => { if (s.built) { layout(s); render(s, still ? s.demo.still : s.t); s.root.querySelectorAll('canvas').forEach(c => { c.__th = null; }); } }); });
  addEventListener('resize', () => { stages.forEach(s => { layout(s); if (s.built) render(s, s.t); }); });

  // follow the system look while the page is open
  lightMQ.addEventListener('change', () => stages.forEach(s => {
    if (!s.built || s.el.dataset.theme) return;
    s.root.classList.toggle('light', lightMQ.matches);
    s.root.querySelectorAll('canvas').forEach(c => { c.__th = null; });
    render(s, s.t);
  }));

  if (!still) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const s = stages.find(x => x.el === e.target); s.visible = e.isIntersecting;
      if (e.isIntersecting && e.intersectionRatio > .3 && s.t0 == null && !s.after) s.t0 = performance.now() + 250;
    }), { threshold: [0, .3, .6] });
    stages.forEach(s => io.observe(s.el));
    // The two looks in the comparison are one picture: they share a single clock and visibility.
    const pair = stages.filter(s => s.el.hasAttribute('data-wipe-side'));
    const loop = now => {
      if (pair.length > 1) {
        const t0 = pair.map(s => s.t0).filter(v => v != null).sort((x, y) => x - y)[0];
        const vis = pair.some(s => s.visible);
        pair.forEach(s => { if (t0 != null) s.t0 = t0; s.visible = vis; });
      }
      for (const s of stages) {
        if (!s.built) continue;
        if (s.after && s.t0 == null) { const p = stages.find(x => x.name === s.after); if (p && p.done) s.t0 = now + 200; }
        if (s.t0 == null || !s.visible || s.done) continue;
        const t = Math.max(0, (now - s.t0) / 1000);
        render(s, Math.min(t, s.demo.dur));
        if (t >= s.demo.dur) { s.done = true; s.el.classList.add('done'); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- beatgrid tabs: real buttons driving the real grids ---------- */
  function wireTabs(s) {
    const list = document.querySelector('[data-tabs]'); if (!list) return;
    list.innerHTML = s.demo.tabs.map((l, i) => `<button type="button" role="tab" id="gtab-${i}" aria-selected="false" tabindex="-1"><i aria-hidden="true"></i>${l}</button>`).join('');
    const btns = [...list.children];
    s.demo.onTab = i => btns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    const pick = i => { if (s.t0 == null) s.t0 = performance.now(); s.demo.select(i); if (still) render(s, s.t); };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => pick(i));
      b.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const j = (i + d + btns.length) % btns.length; btns[j].focus(); pick(j); });
    });
  }

  /* ---------- reveals ---------- */
  const reveals = document.querySelectorAll('.reveal, .reveal-frame');
  if (still) reveals.forEach(r => r.classList.add('in'));
  else {
    const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(r => rio.observe(r));
  }

  /* ---------- the rail completes as you read ---------- */
  const chapters = [...document.querySelectorAll('.chapter')];
  const items = [...document.querySelectorAll('.rail li')];
  const left = document.querySelector('[data-rail-left]'), readyEl = document.querySelector('[data-ready]');
  const railEl = document.querySelector('.rail');
  let lastCur = -2;
  function rail() {
    const mid = innerHeight * .45; let cur = -1;
    chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < mid) cur = i; });
    const allDone = readyEl && readyEl.getBoundingClientRect().top < innerHeight * .8;
    // The steps belong to the steps: the list fades out as the payoff comes into view.
    if (railEl && readyEl) railEl.classList.toggle('gone', readyEl.getBoundingClientRect().top < innerHeight * .92);
    const key = allDone ? 99 : cur; if (key === lastCur) return; lastCur = key;
    items.forEach((li, i) => { li.classList.toggle('done', allDone || i < cur); li.classList.toggle('now', !allDone && i === cur); });
    if (left) { left.textContent = allDone ? 'ready to play' : cur < 0 ? `${items.length} steps` : `${items.length - cur} to go`; left.classList.toggle('ok', !!allDone); }
    const now = items[cur]; if (now && innerWidth <= 1100) { const strip = now.closest('.rail-in'); strip.scrollTo({ left: now.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' }); }
  }
  addEventListener('scroll', rail, { passive: true }); rail();

  /* ---------- character ticker: one word per beat at 120 BPM ---------- */
  const tick = document.querySelector('[data-ticker]');
  if (tick && window.SOLCO) {
    const d = window.SOLCO.deck, UI = window.UI;
    const words = [['Energy', d.energy], ['Drive', d.arousal], ['Mood', d.valence], ['Groove', d.dance], ['Vocals', d.vocal], ['Peak', d.peak]].map(([n, v]) => [n, Math.round(v)]);
    const one = words.map(([n, v]) => `<span style="color:${UI.charColor(v)}">${n}<small>${v}</small></span>`).join('');
    tick.innerHTML = one + one + one;
    if (!still) {
      let i = 0, vis = false; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(tick);
      const spans = () => [...tick.children];
      setInterval(() => {
        if (!vis) return;
        i++; const sp = spans(), n = words.length;
        tick.style.transition = 'transform .38s cubic-bezier(.16,.9,.24,1)';
        tick.style.transform = `translateX(${-sp[i].offsetLeft}px)`;
        if (i >= n) setTimeout(() => { tick.style.transition = 'none'; i = 0; tick.style.transform = 'translateX(0)'; }, 420);
      }, 500);
    }
  }

  /* ---------- dark and light, side by side ---------- */
  const wipe = document.querySelector('[data-wipe]');
  if (wipe) {
    const h = wipe.querySelector('.wipe-handle');
    const set = x => { x = Math.max(0, Math.min(100, x)); wipe.style.setProperty('--x', x + '%'); h.setAttribute('aria-valuenow', Math.round(x)); h.setAttribute('aria-valuetext', `${Math.round(x)} percent dark`); };
    let drag = false;
    const at = e => { const r = wipe.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    wipe.addEventListener('pointerdown', e => { drag = true; wipe.setPointerCapture(e.pointerId); at(e); });
    wipe.addEventListener('pointermove', e => { if (drag) at(e); });
    wipe.addEventListener('pointerup', () => { drag = false; });
    h.addEventListener('keydown', e => { const v = parseFloat(getComputedStyle(wipe).getPropertyValue('--x')); const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - step); e.preventDefault(); } if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + step); e.preventDefault(); }
      if (e.key === 'Home') { set(0); e.preventDefault(); } if (e.key === 'End') { set(100); e.preventDefault(); } });
  }

  /* ---------- the ending: a download passes through Solco onto the USB ---------- */
  const flow = document.querySelector('[data-flow]');
  if (flow && !still) {
    new IntersectionObserver(([e]) => flow.classList.toggle('run', e.isIntersecting), { threshold: .4 }).observe(flow);
  }

  /* ---------- the launch film, loaded only when asked for ---------- */
  const film = document.querySelector('[data-film]'), filmVideo = film && film.querySelector('[data-film-video]');
  if (film && filmVideo) {
    const close = () => { filmVideo.pause(); film.close(); };
    document.querySelectorAll('[data-film-open]').forEach(b => b.addEventListener('click', () => {
      if (!filmVideo.src) filmVideo.src = 'https://github.com/crmne/solco-site/releases/download/film-v5/solco-launch-web-1080p.mp4';
      film.showModal(); filmVideo.play().catch(() => {});
      if (window.plausible) window.plausible('Film play');
    }));
    film.querySelector('[data-film-close]').addEventListener('click', close);
    // If a browser won't play the file from the release, offer it directly instead of a broken player.
    filmVideo.addEventListener('error', () => {
      if (film.querySelector('.film-fallback')) return;
      film.querySelector('.film-frame').insertAdjacentHTML('beforeend', '<a class="film-fallback" href="https://github.com/crmne/solco-site/releases/download/film-v5/solco-launch-web-1080p.mp4" target="_blank" rel="noopener">Open the film</a>');
    });
    film.addEventListener('click', e => { if (e.target === film) close(); });
    film.addEventListener('close', () => filmVideo.pause());
  }

  /* ---------- waitlist: our own form on the getwaitlist API (email first, questions optional) ---------- */
  const wl = document.querySelector('[data-wl]');
  if (wl) {
    const API = 'https://api.getwaitlist.com/api/v1', ID = 33098;
    // Kept in sync with the dashboard; refreshed from the API when someone starts to sign up.
    let questions = [
      ['What do you play on most?', ['Newer Pioneer: CDJ-3000X / CDJ-1500X / XDJ-AZ / OPUS-QUAD / OMNIS-DUO', ' Classic Pioneer: CDJ-3000 / CDJ-2000NXS2 / XDJ-RX3 / XDJ-XZ or older', ' Denon DJ (Engine)', ' Traktor', ' Serato', ' A controller with rekordbox', ' Something else']],
      ['Where do you play most?', ['Clubs and festivals', ' Bars and small venues', ' Private parties and weddings', ' Radio and streams', ' At home', ' Something else']],
      ['What slows you down most?', ['Finding the right track mid-set', ' Fixing tags and covers', ' Beatgrids that drift', ' Duplicates', ' Building playlists', ' Getting music onto the USB', ' Something else']],
      ['How many tracks do you have?', ['Under 1000', ' 1000 to 5000', ' 5000 to 20000', ' Over 20000']],
    ];
    const $ = k => wl.querySelector(`[data-${k}]`), email = wl.querySelector('#wl-email'), msg = $('msg');
    const say = (text, err) => { msg.innerHTML = text; msg.classList.toggle('err', !!err); };
    const fallback = 'Write to <a href="mailto:hello@plenty.is?subject=Solco%20waitlist">hello@plenty.is</a> and I will add you.';
    const renderQs = () => {
      $('qs').innerHTML = questions.map(([q, answers], i) => `<div><label for="wl-q${i}">${esc(q)}</label><select id="wl-q${i}" class="empty"><option value="">Choose one</option>${answers.map(a => `<option value="${esc(a)}">${esc(a.trim())}</option>`).join('')}</select></div>`).join('');
      $('qs').querySelectorAll('select').forEach(s => s.addEventListener('change', () => s.classList.toggle('empty', !s.value)));
    };
    const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    let step = 1, busy = false;
    const submit = async withAnswers => {
      if (busy) return; busy = true;
      wl.querySelectorAll('.wl-go').forEach(b => b.disabled = true); say('Adding you…');
      const answers = withAnswers ? [...$('qs').querySelectorAll('select')].map((s, i) => s.value && { question_value: questions[i][0], optional: true, answer_value: s.value }).filter(Boolean) : [];
      try {
        const res = await fetch(`${API}/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waitlist_id: ID, email: email.value.trim(), referral_link: location.href, ...(answers.length ? { answers } : {}) }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data && (data.error_string || data.message)) || '');
        $('s1').hidden = true; $('s2').hidden = true; $('done').hidden = false; say('');
        if (data.priority) $('place').textContent = `, number ${data.priority}`;
        $('ref').value = data.referral_link || location.origin + '/';
        $('done').focus();
      } catch (e) {
        say(`${e.message ? esc(e.message) + ' ' : 'That did not go through. '}${fallback}`, true);
      } finally { busy = false; wl.querySelectorAll('.wl-go').forEach(b => b.disabled = false); }
    };
    // Ask for the current questions (dashboard is the source of truth); fall back to the built-in list if the API is slow.
    const loadQuestions = () => Promise.race([
      fetch(`${API}/waitlist/${ID}`).then(r => r.json()).then(d => (d.questions || []).filter(q => !q.soft_deleted).map(q => [q.question_value, q.answer_value])),
      new Promise(res => setTimeout(() => res(null), 2500)),
    ]).catch(() => null);
    wl.addEventListener('submit', async e => {
      e.preventDefault();
      if (step !== 1) return submit(true);
      if (!email.checkValidity() || !email.value.trim()) { say('Please enter a valid email address.', true); email.focus(); return; }
      if (busy) return;
      wl.querySelectorAll('.wl-go').forEach(b => b.disabled = true); say('');
      const qs = await loadQuestions();
      wl.querySelectorAll('.wl-go').forEach(b => b.disabled = false);
      if (qs) questions = qs;
      if (!questions.length) return submit(false);
      step = 2; renderQs(); $('s1').hidden = true; $('s2').hidden = false;
      wl.querySelector('#wl-q0').focus({ preventScroll: true });
    });
    $('skip').addEventListener('click', () => submit(false));
    $('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('ref').value); $('copy').textContent = 'Copied'; } catch { $('ref').select(); } });
  }
  document.querySelectorAll('[data-join]').forEach(a => a.addEventListener('click', e => {
    const target = document.getElementById('waitlist'); if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const focus = () => { const i = [...target.querySelectorAll('#wl-email, select, [data-done]')].find(el => el.offsetParent !== null); if (i) i.focus({ preventScroll: true }); else { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); } };
    setTimeout(focus, reduce ? 0 : 700);
    history.replaceState(null, '', '#waitlist');
  }));
})();
