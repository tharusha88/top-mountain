/* Top Mountain Resort — the stays
   The room photo wall itself is built by js/rooms.js. This file only adds a light
   reveal to the "Bring everyone" list. */
(() => {
  const sec = document.querySelector('.stays');
  const G = window.gsap;
  if (!sec || !G || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  G.registerPlugin(window.ScrollTrigger);
  G.from(sec.querySelectorAll('.more__list li'), {
    y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
    scrollTrigger: { trigger: sec.querySelector('.more__list'), start: 'top 88%' }
  });
})();
