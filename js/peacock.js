/* Top Mountain Resort — peacock flight video
   Plays only while on screen, keeps captions, chapter list and progress in step
   with the video, tints the section with the video's own colours, and tilts the
   frame toward the pointer. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sec = $('.peacock');
  if (!sec) return;

  const video = $('.peacock__video', sec);
  const frame = $('.peacock__frame', sec);
  const stage = $('.peacock__stage', sec);
  const toggle = $('.peacock__toggle', sec);
  const capNum = $('.peacock__cap-num', sec);
  const capTxt = $('.peacock__cap-txt', sec);
  const prog = $('.peacock__progress i', sec);
  const canvas = $('.peacock__ambient', sec);
  const ctx = canvas.getContext('2d');
  const steps = $$('.peacock__steps button', sec).map(b => ({
    b, t: parseFloat(b.dataset.t), bar: $('.peacock__bar b', b), label: $('.peacock__label', b).textContent.trim()
  }));
  const SLOW = [7.05, 13.0]; // the quarter-speed stretch of the edit, in seconds
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const G = !reduce && window.gsap ? window.gsap : null;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, '0');

  let userPaused = reduce; // reduced motion: wait for a click
  let visible = false, raf = 0, cur = 0, lastPaint = 0;

  /* ambient glow: a tiny copy of the picture, blurred huge behind everything */
  const paint = src => { try { ctx.drawImage(src, 0, 0, canvas.width, canvas.height); } catch (_) { /* not ready */ } };
  const poster = new Image();
  poster.onload = () => paint(poster);
  poster.src = video.getAttribute('poster');

  const duration = () => (isFinite(video.duration) && video.duration) || 15.33;
  const chapterAt = t => steps.reduce((k, s, i) => (t >= s.t ? i : k), 0);

  const setChapter = k => {
    if (k === cur) return;
    cur = k;
    steps.forEach((s, i) => s.b.classList.toggle('is-on', i === k));
    const swap = () => { capNum.textContent = pad2(k + 1); capTxt.textContent = steps[k].label; };
    if (!G) { swap(); return; }
    G.timeline()
      .to([capNum, capTxt], { yPercent: -120, opacity: 0, duration: 0.28, ease: 'power2.in', stagger: 0.04, overwrite: true })
      .add(swap)
      .fromTo([capNum, capTxt], { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06 });
  };

  const sync = () => {
    const t = video.currentTime, d = duration();
    const k = chapterAt(t);
    setChapter(k);
    prog.style.transform = `scaleX(${clamp(t / d, 0, 1)})`;
    steps.forEach((s, i) => {
      const end = i < steps.length - 1 ? steps[i + 1].t : d;
      const p = i < k ? 1 : i > k ? 0 : clamp((t - s.t) / (end - s.t), 0, 1);
      s.bar.style.transform = `scaleX(${p})`;
    });
    sec.classList.toggle('is-slow', t >= SLOW[0] && t <= SLOW[1]);
  };

  /* pointer tilt */
  let tx = 0, ty = 0, rx = 0, ry = 0;
  if (fine && !reduce) {
    sec.addEventListener('pointermove', e => {
      const r = frame.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 1.6), -1, 1);
      ty = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -1, 1);
    });
    sec.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }

  const loop = now => {
    sync();
    if (!video.paused && video.readyState >= 2 && now - lastPaint > 120) { paint(video); lastPaint = now; }
    if (fine && !reduce) {
      rx += (-ty * 5 - rx) * 0.08;
      ry += (tx * 9 - ry) * 0.08;
      frame.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
    raf = requestAnimationFrame(loop);
  };
  const startLoop = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };

  /* play / pause */
  const play = () => {
    if (video.preload === 'none') video.preload = 'auto';
    const p = video.play();
    if (p && p.catch) p.catch(() => { frame.classList.add('is-paused'); });
  };
  const ui = () => {
    frame.classList.toggle('is-paused', video.paused);
    toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
  };
  video.addEventListener('play', ui);
  video.addEventListener('pause', ui);
  ui();

  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; play(); }
    else { userPaused = true; video.pause(); }
  });
  steps.forEach(s => s.b.addEventListener('click', () => {
    userPaused = false;
    if (video.readyState >= 1) video.currentTime = s.t + 0.02;
    else video.addEventListener('loadedmetadata', () => { video.currentTime = s.t + 0.02; }, { once: true });
    play();
    sync();
  }));

  // start fetching a little before the section arrives; play only while it is on screen
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && video.preload === 'none') video.preload = 'auto';
  }, { rootMargin: '600px 0px' }).observe(sec);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { if (!userPaused) play(); startLoop(); }
    else { if (!video.paused) video.pause(); stopLoop(); }
  }, { threshold: 0.2 }).observe(sec);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (visible && !userPaused) play();
  });

  /* entrance: the frame opens up as it scrolls in, the feather rings swing into place */
  if (G && window.ScrollTrigger) {
    G.registerPlugin(window.ScrollTrigger);
    const st = { trigger: stage, start: 'top 92%', end: 'center 55%', scrub: 0.6 };
    G.fromTo(frame, { clipPath: 'inset(16% 20% 16% 20% round 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 8px)', ease: 'none', scrollTrigger: st });
    G.fromTo(video, { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { ...st } });
    G.fromTo('.peacock__rings', { scale: 0.75, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: 0, ease: 'none', scrollTrigger: { ...st } });
    G.to('.peacock__rings', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
})();
