/* Hero background video — reads SITE_CONFIG.heroVideo and adds the video behind the hero
   once the page has loaded. The hero photo stays as the fallback until the video is playing. */
(() => {
  const cfg = window.SITE_CONFIG && window.SITE_CONFIG.heroVideo;
  const media = document.querySelector('.hero__media');
  if (!cfg || !media || !cfg.sources || !cfg.sources.length) return;

  // respect people who asked for less motion or less data
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

  const pick = cfg.sources.find(s => !s.media || matchMedia(s.media).matches);
  if (!pick) return;

  const add = () => {
    const v = document.createElement('video');
    v.className = 'hero__video';
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    if (cfg.poster) v.poster = cfg.poster;
    const s = document.createElement('source');
    s.src = pick.src; if (pick.type) s.type = pick.type;
    v.appendChild(s);
    v.addEventListener('playing', () => v.classList.add('is-on'), { once: true });
    v.addEventListener('error', () => v.remove(), true);
    media.querySelector('.hero__img').after(v);
    const p = v.play(); if (p && p.catch) p.catch(() => {});

    // pause while the hero is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(media);
    }
  };
  if (document.readyState === 'complete') add(); else window.addEventListener('load', add);
})();
