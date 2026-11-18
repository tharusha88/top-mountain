/* Top Mountain Resort — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
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

  /* ---------- GSAP ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // URL bar show/hide must not re-pin everything

  // resort name: split into letters so they can clear out of the mist one by one
  const splitChars = root => {
    const chars = [];
    [...root.childNodes].forEach(node => {
      if (node.nodeType === 1) { chars.push(...splitChars(node)); return; }
      if (node.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(c => {
        if (/\s/.test(c)) { frag.appendChild(document.createTextNode(c)); return; }
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c;
        frag.appendChild(s); chars.push(s);
      });
      node.replaceWith(frag);
    });
    return chars;
  };
  const heroTitle = $('.hero__title');
  const heroChars = splitChars($('.hero__name'));

  // short intro: the photo brightens and the name comes into focus (about 1.5s, nav usable at once)
  gsap.set(heroChars, { opacity: 0, filter: 'blur(10px)', yPercent: 12 });
  gsap.set('.hero__fade', { opacity: 0, y: 12 });
  gsap.set('.hero__img', { scale: 1.12, filter: 'brightness(.55)' });
  gsap.timeline({ onComplete: () => heroTitle.classList.add('is-calm') })
    .to('.hero__img', { scale: 1.06, filter: 'brightness(1)', duration: 1.6, ease: 'power3.out' }, 0)
    .to(heroChars, { opacity: 1, filter: 'blur(0px)', yPercent: 0, duration: 1, ease: 'power2.out', stagger: { amount: .5 }, clearProps: 'opacity,filter,transform' }, .1)
    .to('.hero__fade', { opacity: 1, y: 0, duration: .7, stagger: .08 }, .5);

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

  const mm = gsap.matchMedia();

  // stays — horizontal scroll, snapping and photo swaps live in js/stays.js

  // craft accordion reveal
  gsap.from('.acc__item', { yPercent: 12, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.acc', start: 'top 82%' } });


  // one day — morning to night: see js/day.js

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
