/* Top Mountain Resort — "One day, one hillside"
   The section holds still while you scroll through a day: the sky gradient moves
   from morning to night, the sun travels the dial and turns into the moon, the
   clock runs, and the Mud House's lanterns light up as it gets dark. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sec = $('.day');
  if (!sec) return;

  const clock = $('.day__clock', sec);
  const phase = $('.day__phase', sec);
  const line = $('.day__line', sec);
  const marks = $$('.day__marks li', sec);
  const orb = $('.day__orb', sec);
  const arc = $('.day__arc-fill', sec);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = !reduce && window.gsap && window.ScrollTrigger ? window.gsap : null;

  const PHASES = [
    { name: 'Morning', line: 'Mist lifts off the valley, and the tea is on the veranda.' },
    { name: 'Afternoon', line: 'Warm sun on the clay walls, and the whole estate to wander.' },
    { name: 'Golden hour', line: 'Low light turns the hillside to amber.' },
    { name: 'Blue hour', line: 'The lanterns come on, one by one.' },
    { name: 'Night', line: 'A fire, a sky full of stars, and a quiet hillside.' }
  ];
  const CUTS = [0.2, 0.42, 0.6, 0.78];                    // where each part of the day begins
  const SUNSET = 0.6;                                     // from here the moon is up
  const KEYS_P = [0, 0.2, 0.42, 0.6, 0.78, 1];
  const KEYS_T = [370, 720, 990, 1110, 1185, 1300];       // 06:10 … 21:40, in minutes
  const timeAt = p => {
    let i = 1;
    while (i < KEYS_P.length - 1 && p > KEYS_P[i]) i++;
    return KEYS_T[i - 1] + (KEYS_T[i] - KEYS_T[i - 1]) * (p - KEYS_P[i - 1]) / (KEYS_P[i] - KEYS_P[i - 1]);
  };

  // a scatter of stars for the night sky, kept to the top two-thirds
  const stars = $('.day__stars', sec);
  for (let k = 0; k < 70; k++) {
    const s = document.createElement('span');
    s.style.left = (Math.random() * 100).toFixed(2) + '%';
    s.style.top = (Math.random() * 66).toFixed(2) + '%';
    s.style.setProperty('--s', (1 + Math.random() * 1.8).toFixed(1) + 'px');
    s.style.setProperty('--d', (2 + Math.random() * 3).toFixed(1) + 's');
    s.style.setProperty('--dl', (-Math.random() * 4).toFixed(1) + 's');
    stars.appendChild(s);
  }

  let cur = 0;
  const setPhase = k => {
    if (k === cur) return;
    cur = k;
    marks.forEach((li, i) => li.classList.toggle('is-on', i === k));
    const swap = () => { phase.textContent = PHASES[k].name; line.textContent = PHASES[k].line; };
    if (!G) { swap(); return; }
    G.timeline()
      .to([phase, line], { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in', overwrite: true })
      .add(swap)
      .fromTo([phase, line], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.05 });
  };
  const setP = p => {
    const m = Math.round(timeAt(p));
    clock.textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    setPhase(CUTS.filter(c => p >= c).length);
    // the sun crosses the whole arc by the end of golden hour; then the moon rises from the left
    const night = p >= SUNSET;
    const t = night ? (p - SUNSET) / (1 - SUNSET) : p / SUNSET;
    const share = night ? 0.04 + 0.5 * t : 0.04 + 0.92 * t; // how far along the arc, 0–1
    const a = Math.PI * share;
    orb.setAttribute('cx', (120 - 110 * Math.cos(a)).toFixed(2));
    orb.setAttribute('cy', (120 - 110 * Math.sin(a)).toFixed(2));
    arc.style.strokeDashoffset = (1 - share).toFixed(4);
    sec.classList.toggle('is-night', night);
  };
  setP(0);
  if (!G) return; // reduced motion: a still morning, no pinning

  G.registerPlugin(window.ScrollTrigger);
  G.timeline({
    scrollTrigger: {
      trigger: sec, start: 'top top', end: '+=160%', pin: true, scrub: 0.5, refreshPriority: 1,
      onUpdate: self => setP(self.progress)
    }
  })
    // sky: each part of the day fades in over the last
    .to('.day__sky--noon', { opacity: 1, duration: 0.16, ease: 'none' }, 0.1)
    .to('.day__sky--gold', { opacity: 1, duration: 0.16, ease: 'none' }, 0.34)
    .to('.day__sky--blue', { opacity: 1, duration: 0.16, ease: 'none' }, 0.54)
    .to('.day__sky--night', { opacity: 1, duration: 0.16, ease: 'none' }, 0.72)
    .to('.day__stars', { opacity: 1, duration: 0.14, ease: 'none' }, 0.76)
    // the photo: a slow push in, warm at golden hour, blue at dusk, then dark with its lights on
    .fromTo('.day__img', { scale: 1.08 }, { scale: 1, duration: 1, ease: 'none' }, 0)
    .to('.day__warm', { opacity: 0.8, duration: 0.18, ease: 'none' }, 0.36)
    .to('.day__warm', { opacity: 0, duration: 0.16, ease: 'none' }, 0.58)
    .to('.day__dusk', { opacity: 0.45, duration: 0.16, ease: 'none' }, 0.54)
    .to('.day__dusk', { opacity: 0, duration: 0.14, ease: 'none' }, 0.74)
    .to('.day__night', { opacity: 0.8, duration: 0.2, ease: 'none' }, 0.66)
    .to('.day__glows', { opacity: 1, duration: 0.18, ease: 'none' }, 0.6)
    .fromTo('.day__quote', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.1, ease: 'none' }, 0.84)
    .to('.day__hint', { opacity: 0, duration: 0.08 }, 0.1)
    .to({}, { duration: 0.06 }, 0.94);
})();
