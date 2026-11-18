/* Top Mountain Resort — peacock film strip
   Three panels each loop one moment of the film and play only while on screen.
   A panel, or "Watch the full film", opens the whole edit in a viewer that keeps
   its caption, chapters, progress and colour glow in step with the film. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sec = $('.peacock');
  const film = $('#pf');
  if (!sec || !film) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const G = !reduce && window.gsap ? window.gsap : null;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, '0');
  const play = v => {
    if (v.preload === 'none') v.preload = 'auto';
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  };

  /* ---------- the strip ---------- */
  const panels = $$('.pc-panel__video', sec);
  const onScreen = new Set();
  let filmOpen = false;
  if (!reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { onScreen.add(e.target); if (!filmOpen) play(e.target); }
      else { onScreen.delete(e.target); e.target.pause(); }
    }), { threshold: 0.35 });
    panels.forEach(v => io.observe(v));
  }
  const resumePanels = () => { if (!reduce && !filmOpen && !document.hidden) onScreen.forEach(play); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { panels.forEach(v => v.pause()); video.pause(); }
    else if (filmOpen) play(video); else resumePanels();
  });

  // a slight 3D tilt toward the pointer
  if (fine && !reduce) $$('.pc-panel__btn', sec).forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 8 + 'deg');
      btn.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 6 + 'deg');
    });
    btn.addEventListener('pointerleave', () => { btn.style.setProperty('--rx', '0deg'); btn.style.setProperty('--ry', '0deg'); });
  });

  // entrance: the panels rise in one after another, their pictures uncovering
  if (G && window.ScrollTrigger) {
    G.registerPlugin(window.ScrollTrigger);
    const items = $$('.pc-panel', sec);
    G.set(items, { opacity: 0, y: 60 });
    window.ScrollTrigger.create({
      trigger: $('.peacock__strip', sec), start: 'top 82%', once: true,
      onEnter: () => {
        G.to(items, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.14, clearProps: 'opacity,transform' });
        G.fromTo($$('.pc-panel__btn', sec), { clipPath: 'inset(30% 0% 0% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.4, ease: 'power3.out', stagger: 0.14, clearProps: 'clipPath' });
      }
    });
  }

  /* ---------- the full film ---------- */
  const video = $('.pf__video', film);
  const canvas = $('.pf__ambient', film);
  const ctx = canvas.getContext('2d');
  const capNum = $('.pf__cap-num', film);
  const capTxt = $('.pf__cap-txt', film);
  const prog = $('.pf__progress i', film);
  const toggle = $('.pf__toggle', film);
  const closeBtn = $('.pf__close', film);
  const outside = $$('body > header, body > main, body > footer, #menu');
  const chapters = $$('.pf__chapters button', film).map(b => ({
    b, t: parseFloat(b.dataset.t),
    label: [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
  }));
  const SLOW = [7.05, 13.0]; // the quarter-speed stretch of the edit, in seconds
  let cur = -1, raf = 0, lastPaint = 0, opener = null;

  const duration = () => (isFinite(video.duration) && video.duration) || 15.33;
  const paint = src => { try { ctx.drawImage(src, 0, 0, canvas.width, canvas.height); } catch (_) { /* not ready */ } };
  const setChapter = k => {
    if (k === cur) return;
    cur = k;
    chapters.forEach((c, i) => c.b.classList.toggle('is-on', i === k));
    const swap = () => { capNum.textContent = pad2(k + 1); capTxt.textContent = chapters[k].label; };
    if (!G) { swap(); return; }
    G.timeline()
      .to([capNum, capTxt], { yPercent: -120, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.04, overwrite: true })
      .add(swap)
      .fromTo([capNum, capTxt], { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.06 });
  };
  const sync = () => {
    const t = video.currentTime, d = duration();
    const k = chapters.reduce((a, c, i) => (t >= c.t ? i : a), 0);
    setChapter(k);
    prog.style.transform = `scaleX(${clamp(t / d, 0, 1)})`;
    chapters.forEach((c, i) => {
      const end = i < chapters.length - 1 ? chapters[i + 1].t : d;
      c.b.style.setProperty('--p', i < k ? 1 : i > k ? 0 : clamp((t - c.t) / (end - c.t), 0, 1).toFixed(4));
    });
    film.classList.toggle('is-slow', t >= SLOW[0] && t <= SLOW[1]);
  };
  const loop = now => {
    sync();
    if (!video.paused && video.readyState >= 2 && now - lastPaint > 120) { paint(video); lastPaint = now; }
    raf = requestAnimationFrame(loop);
  };
  const ui = () => {
    film.classList.toggle('is-paused', video.paused);
    toggle.setAttribute('aria-label', video.paused ? 'Play film' : 'Pause film');
  };
  video.addEventListener('play', ui);
  video.addEventListener('pause', ui);
  const seek = t => {
    if (video.readyState >= 1) video.currentTime = t + 0.02;
    else video.addEventListener('loadedmetadata', () => { video.currentTime = t + 0.02; }, { once: true });
  };

  const open = (t, from) => {
    opener = from;
    filmOpen = true;
    panels.forEach(v => v.pause());
    const poster = new Image();
    poster.onload = () => paint(poster);
    poster.src = video.getAttribute('poster');
    film.hidden = false;
    document.body.classList.add('pf-open');
    outside.forEach(el => { el.inert = true; });
    seek(t);
    play(video);
    void film.offsetWidth; // apply the hidden state first so the fade-in runs
    film.classList.add('is-open');
    ui();
    if (!raf) raf = requestAnimationFrame(loop);
    closeBtn.focus({ preventScroll: true });
  };
  const close = () => {
    if (film.hidden) return;
    video.pause();
    film.classList.remove('is-open');
    document.body.classList.remove('pf-open');
    outside.forEach(el => { el.inert = false; });
    cancelAnimationFrame(raf); raf = 0;
    filmOpen = false;
    setTimeout(() => { film.hidden = true; }, reduce ? 0 : 450);
    resumePanels();
    if (opener) opener.focus({ preventScroll: true });
  };

  sec.addEventListener('click', e => {
    const b = e.target.closest('[data-t]');
    if (b) open(parseFloat(b.dataset.t), b);
  });
  chapters.forEach(c => c.b.addEventListener('click', () => { seek(c.t); play(video); sync(); }));
  toggle.addEventListener('click', () => { if (video.paused) play(video); else video.pause(); });
  closeBtn.addEventListener('click', close);
  $('.pf__bg', film).addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (film.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); toggle.click(); }
    else if (e.key === 'Tab') {
      const f = $$('button', film).filter(el => el.getClientRects().length);
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
})();
