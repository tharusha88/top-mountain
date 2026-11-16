/* Top Mountain Resort — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const loader = $('.loader');
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- things that work without GSAP ---------- */

  // nav background
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // anchor links
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth' });
  }));

  // mobile menu
  const toggle = $('.nav__toggle'), menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
  };
  toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  // guest quotes
  const quotes = $$('.quote'), dots = $$('.q-dots i');
  let qi = 0, qTimer;
  const showQuote = i => {
    qi = (i + quotes.length) % quotes.length;
    quotes.forEach((q, k) => q.classList.toggle('is-on', k === qi));
    dots.forEach((d, k) => d.classList.toggle('is-on', k === qi));
    clearInterval(qTimer);
    qTimer = setInterval(() => showQuote(qi + 1), 6500);
  };
  $('.q-prev').addEventListener('click', () => showQuote(qi - 1));
  $('.q-next').addEventListener('click', () => showQuote(qi + 1));
  showQuote(0);

  // booking form (front end only for now — no backend yet)
  const form = $('.bform'), msg = $('.bform__msg');
  const today = new Date().toISOString().slice(0, 10);
  form.arrive.min = today; form.leave.min = today;
  form.arrive.addEventListener('change', () => { form.leave.min = form.arrive.value || today; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const a = form.arrive.value, l = form.leave.value;
    if (!a || !l) { msg.textContent = 'Please choose your arrival and leaving dates.'; return; }
    if (l <= a) { msg.textContent = 'Your leaving date needs to be after your arrival date.'; return; }
    const nights = Math.round((new Date(l) - new Date(a)) / 864e5);
    const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    msg.textContent = `${fmt(a)} to ${fmt(l)} · ${nights} night${nights > 1 ? 's' : ''} · ${form.guests.value}. To confirm, call +94 77 736 8264.`;
  });

  // craft accordion
  const accItems = $$('.acc__item');
  const openAcc = el => accItems.forEach(i => i.classList.toggle('is-on', i === el));
  accItems.forEach(el => {
    el.addEventListener('mouseenter', () => openAcc(el));
    el.addEventListener('click', () => openAcc(el));
    el.addEventListener('focus', () => openAcc(el));
  });

  // fireflies
  $$('.flies').forEach(box => {
    const count = matchMedia('(max-width: 899px)').matches ? 7 : 16;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.style.left = (5 + Math.random() * 90) + '%';
      s.style.top = (35 + Math.random() * 60) + '%';
      s.style.setProperty('--x', (Math.random() * 80 - 40) + 'px');
      s.style.setProperty('--y', (-20 - Math.random() * 60) + 'px');
      s.style.setProperty('--d', (6 + Math.random() * 8) + 's');
      s.style.setProperty('--dl', (-Math.random() * 10) + 's');
      box.appendChild(s);
    }
  });

  // custom cursor
  const cursor = $('.cursor');
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const tick = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(tick);
    };
    tick();
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-view'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-view'));
    });
    $$('a,button').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
    });
  }

  /* ---------- GSAP ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    body.classList.remove('is-loading');
    if (loader) loader.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // URL bar show/hide must not re-pin everything

  // hidden start states
  const heroLines = $$('.hero .lines .l > span');
  gsap.set(heroLines, { yPercent: 115 });
  gsap.set('.hero__fade', { opacity: 0, y: 18 });
  gsap.set('.nav', { yPercent: -100 });
  gsap.set('.hero__img', { scale: 1.3, filter: 'brightness(.35)' });

  // loader -> hero intro
  let started = false;
  const start = () => {
    if (started) return; started = true;
    gsap.timeline()
      .to('.loader__bar i', { scaleX: 1, duration: 1.1, ease: 'power2.inOut' })
      .to('.loader__in', { opacity: 0, y: -12, duration: .5 })
      .to(loader, { opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => { loader.style.display = 'none'; body.classList.remove('is-loading'); ScrollTrigger.refresh(); } }, '-=.1')
      .to('.hero__img', { scale: 1.06, filter: 'brightness(1)', duration: 2.6, ease: 'power3.out' }, '-=.9')
      .to(heroLines, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: .12 }, '-=2')
      .to('.nav', { yPercent: 0, duration: .9, ease: 'power3.out' }, '-=1.3')
      .to('.hero__fade', { opacity: 1, y: 0, duration: .9, stagger: .1 }, '-=1.1');
  };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
  setTimeout(start, 3500);

  // hero parallax
  gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '25% top', end: 'bottom top', scrub: true } });

  // headline line reveals (outside hero)
  $$('.lines').filter(el => !el.closest('.hero')).forEach(el => {
    gsap.from($$('.l > span', el), { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: .12, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  // simple reveals
  $$('[data-reveal]').forEach(el => {
    gsap.from(el, { opacity: 0, y: 26, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // chapter one — window opens into a full-screen view
  gsap.timeline({ scrollTrigger: { trigger: '.chapter', start: 'top top', end: '+=170%', scrub: .6, pin: true, refreshPriority: 3 } })
    .to('.chapter__frame', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 }, 0)
    .fromTo('.chapter__frame img', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .to('.chapter__title', { opacity: 0, yPercent: -40, duration: .35 }, .1)
    .fromTo('.chapter__cap', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .3 }, .7)
    .to({}, { duration: .2 });

  const mm = gsap.matchMedia();

  // stays — horizontal scroll on desktop
  mm.add('(min-width: 900px) and (not ((max-height: 559px) and (pointer: coarse)))', () => {
    const track = $('.stays__track'), cur = $('.stays__cur'), stays = $$('.stay');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.stays', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, refreshPriority: 2,
        onUpdate: () => {
          const mid = innerWidth / 2;
          let n = 1;
          stays.forEach((s, i) => { if (s.getBoundingClientRect().left < mid) n = i + 1; });
          cur.textContent = '0' + n;
        }
      }
    });
  });

  // craft accordion reveal
  gsap.from('.acc__item', { yPercent: 12, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.acc', start: 'top 82%' } });

  // image parallax inside frames
  $$('.pimg').forEach(el => {
    const sp = parseFloat(el.dataset.speed || .5);
    gsap.fromTo(el.querySelector('img'), { yPercent: -6 * sp }, { yPercent: 6 * sp, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.dining__frame > img', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.dining__frame', start: 'top bottom', end: 'bottom top', scrub: true } });

  // one day — morning to night
  const clock = $('.day__clock'), phases = $$('.day__phases li');
  const cuts = [.2, .42, .6, .78], keysP = [0, .2, .42, .6, .78, 1], keysT = [370, 720, 990, 1110, 1185, 1300];
  const timeAt = p => { let i = 1; while (i < keysP.length - 1 && p > keysP[i]) i++; return keysT[i - 1] + (keysT[i] - keysT[i - 1]) * (p - keysP[i - 1]) / (keysP[i] - keysP[i - 1]); };
  gsap.timeline({
    scrollTrigger: {
      trigger: '.day', start: 'top top', end: '+=320%', pin: true, scrub: .5, refreshPriority: 1,
      onUpdate: self => {
        const p = self.progress, m = Math.round(timeAt(p));
        clock.textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
        const idx = cuts.filter(c => p >= c).length;
        phases.forEach((li, i) => li.classList.toggle('is-on', i === idx));
      }
    }
  })
    .fromTo('.day__stage', { scale: 1.12 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .to('.day__intro', { opacity: 0, duration: .08 }, .14)
    .to('.day__warm', { opacity: .75, duration: .22, ease: 'none' }, .36)
    .to('.day__warm', { opacity: 0, duration: .2, ease: 'none' }, .62)
    .to('.day__night', { opacity: .74, duration: .34, ease: 'none' }, .54)
    .to('.day__img', { filter: 'saturate(.8) brightness(.95)', duration: .3, ease: 'none' }, .56)
    .to('.day__glows', { opacity: 1, duration: .22, ease: 'none' }, .64)
    .to('.day .flies', { opacity: 1, duration: .15 }, .76)
    .fromTo('.day__quote', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .12 }, .82);

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
