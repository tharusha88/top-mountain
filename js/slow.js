/* Top Mountain Resort — Experience section
   One moment of motion: the balcony photo uncovers from the bottom as it
   scrolls into view. The words use the page's usual reveals. */
(() => {
  const sec = document.querySelector('.slow');
  const G = window.gsap;
  if (!sec || !G || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  G.registerPlugin(window.ScrollTrigger);

  const photo = sec.querySelector('.slow__photo');
  G.timeline({ scrollTrigger: { trigger: photo, start: 'top 85%', end: 'top 30%', scrub: 0.6 } })
    .fromTo(photo, { clipPath: 'inset(45% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
    .fromTo(photo.querySelector('img'), { scale: 1.15 }, { scale: 1, ease: 'none' }, 0);
})();
