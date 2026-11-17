/* Top Mountain Resort — nearby locations
   Drifting photo rows (scroll-reactive, draggable) and a viewer whose
   photo and title morph out of whichever card you opened, and back. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const section = $('.near');
  const lx = $('#lx');
  if (!section || !lx) return;

  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = !reduce && window.gsap ? window.gsap : null;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const cursor = $('.cursor');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, '0');
  const rect = el => el.getBoundingClientRect();
  const decoded = src => { const im = new Image(); im.src = src; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); };
  const hoverCursor = (el, cls) => {
    if (!cursor || !fine) return;
    el.addEventListener('mouseenter', () => cursor.classList.add(cls));
    el.addEventListener('mouseleave', () => cursor.classList.remove(cls));
  };

  /* ---------- places, read from the cards ---------- */
  const places = $$('.loc', section).map((el, i) => {
    const img = $('img', el);
    const p = {
      i, el,
      name: $('.loc__name', el).textContent.trim(),
      type: $('.loc__type', el).textContent.trim(),
      km: parseInt($('.loc__km', el).textContent, 10),
      desc: $('.loc__desc', el).textContent.trim(),
      thumb: img.getAttribute('src'),
      alt: img.alt,
      images: [el.dataset.full, ...(el.dataset.more ? el.dataset.more.split(',') : [])].filter(Boolean),
      map: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((el.dataset.map || '') + ', Sri Lanka')
    };
    el.dataset.i = i;
    el.setAttribute('aria-label', `${p.name}, ${p.km} km away. Open photo and details`);
    // each photo drifts a little differently
    el.style.setProperty('--kd', (13 + (i * 7) % 9) + 's');
    el.style.setProperty('--kdl', (-((i * 3.7) % 13)).toFixed(1) + 's');
    el.style.setProperty('--kx', ['-3%', '2.5%', '-1.5%', '3%'][i % 4]);
    el.style.setProperty('--ky', ['1.5%', '-2%', '-1%', '2%'][(i + 1) % 4]);
    el.style.setProperty('--ko', ['30% 40%', '70% 60%', '50% 30%', '40% 70%'][(i + 2) % 4]);
    return p;
  });
  const N = places.length;

  // a card photo's current drift, expressed as x/y/scale around its centre
  const driftOf = img => {
    const cs = getComputedStyle(img);
    if (!cs.transform || cs.transform === 'none') return { x: 0, y: 0, scale: 1 };
    const m = new DOMMatrixReadOnly(cs.transform);
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    return { scale: m.a, x: m.e + (1 - m.a) * (ox - img.offsetWidth / 2), y: m.f + (1 - m.a) * (oy - img.offsetHeight / 2) };
  };

  /* ---------- drifting rows ---------- */
  const rows = $$('.near__row', section).map(row => {
    const track = $('.near__track', row);
    return { row, track, set: [...track.children], dir: +row.dataset.dir || -1, x: 0, w: 0, hold: 1, mouse: false, kb: false, down: false, drag: false, dragV: 0, skew: 0 };
  });

  const measure = r => {
    const first = r.set[0], last = r.set[r.set.length - 1];
    const gap = parseFloat(getComputedStyle(r.track).columnGap) || 0;
    r.w = last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
  };
  // enough copies of the set to keep the screen covered while it loops
  const fill = r => {
    $$('.loc[aria-hidden]', r.track).forEach(c => c.remove());
    measure(r);
    const copies = r.w > 100 ? Math.max(1, Math.ceil(innerWidth / r.w)) : 1;
    for (let k = 0; k < copies; k++) {
      r.set.forEach(el => {
        const c = el.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('tabindex', '-1');
        c.removeAttribute('aria-label');
        r.track.appendChild(c);
        hoverCursor(c, 'is-view');
      });
    }
  };
  const place = r => {
    if (r.w > 0) { while (r.x <= -r.w) r.x += r.w; while (r.x > 0) r.x -= r.w; }
    r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0) skewX(${r.skew.toFixed(2)}deg)`;
  };
  // put the original (focusable) card on screen, centred where possible
  const reveal = (r, el) => {
    const o = el.offsetLeft - r.set[0].offsetLeft;
    r.x = Math.min(0, (innerWidth - el.offsetWidth) / 2 - o);
    r.skew = 0;
    place(r);
  };

  if (!reduce) {
    rows.forEach((r, k) => { fill(r); r.x = -r.w * (k ? 0.35 : 0.1); place(r); });
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => rows.forEach(r => { const f = r.w ? r.x / r.w : 0; fill(r); r.x = f * r.w; place(r); }), 150);
    });
  }

  // motion: slow drift, faster with page scroll (and reversing on scroll up), throwable by drag
  let running = false, visible = false, raf = 0, last = 0, lastY = scrollY, sDir = 1, boost = 0, kick = 0;
  let isOpen = false;
  const BASE = innerWidth < 900 ? 26 : 38; // px per second
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const y = scrollY, dy = y - lastY; lastY = y;
    if (dy) sDir = dy > 0 ? 1 : -1;
    const want = Math.min(Math.abs(dy) / dt / 260, 7);
    boost += (want - boost) * Math.min(1, dt * (want > boost ? 10 : 2.5));
    kick *= Math.pow(0.08, dt);
    rows.forEach(r => {
      r.hold += ((r.mouse || r.kb ? 0 : 1) - r.hold) * Math.min(1, dt * 5);
      let v = r.dragV;
      if (!r.drag) {
        r.dragV *= Math.pow(0.03, dt);
        v = r.dir * sDir * BASE * (1 + boost + kick) * r.hold + r.dragV;
        r.x += v * dt;
      }
      r.skew += (clamp(-v / 140, -3, 3) - r.skew) * Math.min(1, dt * 6);
      place(r);
    });
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const go = visible && !isOpen && !reduce;
    section.classList.toggle('is-idle', !visible || isOpen);
    if (go && !running) { running = true; last = performance.now(); lastY = scrollY; raf = requestAnimationFrame(frame); }
    if (!go && running) { running = false; cancelAnimationFrame(raf); }
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { rootMargin: '80px 0px' }).observe(section);

  // hover or keyboard focus holds a row still; dragging throws it
  let suppressClick = false;
  rows.forEach(r => {
    if (fine) {
      r.row.addEventListener('mouseenter', () => { r.mouse = true; });
      r.row.addEventListener('mouseleave', () => { r.mouse = false; });
    }
    if (reduce) return;
    r.row.addEventListener('focusin', e => {
      if (!e.target.matches(':focus-visible')) return;
      r.kb = true;
      const b = rect(e.target);
      if (b.left < 0 || b.right > innerWidth) reveal(r, e.target);
    });
    r.row.addEventListener('focusout', () => { r.kb = false; });

    let px = 0, pt = 0, moved = 0, pid = null;
    r.row.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      r.down = true; px = e.clientX; pt = e.timeStamp; moved = 0; pid = e.pointerId; r.dragV = 0;
    });
    r.row.addEventListener('pointermove', e => {
      if (!r.down || e.pointerId !== pid) return;
      const dx = e.clientX - px, dtm = Math.max(1, e.timeStamp - pt);
      px = e.clientX; pt = e.timeStamp; moved += Math.abs(dx);
      if (!r.drag && moved > 6) {
        r.drag = true; r.row.classList.add('is-dragging');
        try { r.row.setPointerCapture(pid); } catch (_) {}
      }
      if (r.drag) { r.x += dx; r.dragV = r.dragV * 0.6 + (dx / dtm * 1000) * 0.4; if (!running) place(r); }
    });
    r.row.addEventListener('pointerup', () => {
      if (!r.down) return;
      r.down = false;
      if (r.drag) {
        r.drag = false; r.row.classList.remove('is-dragging');
        r.dragV = clamp(r.dragV, -3000, 3000);
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      }
    });
    r.row.addEventListener('pointercancel', () => { r.down = false; r.drag = false; r.row.classList.remove('is-dragging'); });
  });

  /* ---------- viewer ---------- */
  const media = $('.lx__media', lx);
  const layers = $$('.lx__img', lx);
  const title = $('.lx__title', lx);
  const kmWrap = $('.lx__km', lx), kmB = $('b', kmWrap);
  const typeEl = $('.lx__type', lx);
  const descEl = $('.lx__desc', lx);
  const mapEl = $('.lx__map', lx);
  const closeBtn = $('.lx__close', lx);
  const countB = $('.lx__count b', lx);
  const thumbsBox = $('.lx__thumbs', lx);
  const bar = $('.lx__bar', lx), barI = $('i', bar);
  const info = [typeEl, title, kmWrap, descEl, mapEl];
  const chrome = [$('.lx__top', lx), $('.lx__nav', lx)];
  const outside = $$('body > header, body > main, body > footer, #menu');

  $('.lx__count', lx).lastChild.textContent = ' / ' + pad2(N);
  const thumbs = places.map(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lx__thumb'; b.setAttribute('aria-label', p.name);
    b.innerHTML = `<img src="${p.thumb}" alt="" loading="lazy" draggable="false">`;
    b.addEventListener('click', () => go(p.i, b));
    hoverCursor(b, 'is-link');
    thumbsBox.appendChild(b);
    return b;
  });

  let busy = false, cur = 0, front = 0, imgK = 0, srcCard = null, byKeyboard = false;
  let kbTween = null, showTimer = null, barTween = null, openTl = null;
  const kmObj = { v: 0 };

  const setInfo = p => {
    typeEl.textContent = p.type;
    title.textContent = p.name;
    descEl.textContent = p.desc;
    mapEl.href = p.map;
    countB.textContent = pad2(p.i + 1);
    thumbs.forEach((t, k) => t.classList.toggle('is-on', k === p.i));
    const t = thumbs[p.i];
    if (thumbsBox.scrollWidth > thumbsBox.clientWidth + 2) {
      thumbsBox.scrollTo({ left: t.offsetLeft - thumbsBox.clientWidth / 2 + t.offsetWidth / 2, behavior: G ? 'smooth' : 'auto' });
    }
  };
  const countKm = (to, from) => {
    if (!G) { kmB.textContent = to; return; }
    kmObj.v = from;
    G.to(kmObj, { v: to, duration: 1.1, ease: 'power3.out', overwrite: true, onUpdate: () => { kmB.textContent = Math.round(kmObj.v); } });
  };

  // slow Ken Burns on the photo on stage
  const drift = img => {
    if (kbTween) kbTween.kill();
    if (!G) return;
    kbTween = G.fromTo(img, { scale: 1, xPercent: 0 }, { scale: 1.09, xPercent: (Math.random() - 0.5) * 3, duration: 14, ease: 'none' });
  };
  // show the cached card-size file at once, swap in the large file once it has loaded
  const load = (img, small, full, alt) => {
    img.dataset.want = full;
    img.src = small; img.alt = alt;
    if (full !== small) decoded(full).then(() => { if (img.dataset.want === full) img.src = full; });
  };
  const clearLayer = l => {
    l.classList.remove('is-cur'); l.removeAttribute('src'); delete l.dataset.want;
    if (G) G.set(l, { clearProps: 'all' });
  };
  // put a photo on stage: instant, wipe (dir 1/-1) or fade
  const show = (small, full, alt, mode, dir = 1) => new Promise(res => {
    const a = layers[front], b = layers[1 - front];
    load(b, small, full, alt);
    const finish = () => {
      if (kbTween) kbTween.kill();
      clearLayer(a);
      b.classList.add('is-cur');
      front = 1 - front;
      drift(b);
      res();
    };
    if (!G || mode === 'instant') { if (G) G.set(b, { clearProps: 'all' }); finish(); return; }
    if (kbTween) kbTween.pause();
    G.set(a, { zIndex: 1 });
    G.set(b, { zIndex: 2, opacity: 1 });
    if (mode === 'fade') {
      G.fromTo(b, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.inOut', onComplete: finish });
      return;
    }
    G.timeline({ onComplete: finish })
      .fromTo(b, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', scale: 1.25 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
      .to(a, { xPercent: -dir * 14, scale: 1.05, filter: 'brightness(.4)', duration: 1.1, ease: 'expo.inOut' }, 0);
  });

  // places with more than one photo cross-fade through them
  const stopShow = () => {
    clearTimeout(showTimer);
    if (barTween) barTween.kill();
    bar.classList.remove('is-on');
  };
  const startShow = () => {
    stopShow();
    const p = places[cur];
    if (!isOpen || p.images.length < 2) return;
    const wait = 5.5;
    bar.classList.add('is-on');
    if (G) barTween = G.fromTo(barI, { scaleX: 0 }, { scaleX: 1, duration: wait, ease: 'none' });
    showTimer = setTimeout(() => {
      imgK = (imgK + 1) % p.images.length;
      const src = p.images[imgK];
      decoded(src).then(() => {
        if (!isOpen || busy || places[cur] !== p) return;
        show(src, src, p.alt, 'fade').then(startShow);
      });
    }, wait * 1000);
  };

  // a fixed copy of a photo that flies between two boxes
  const flyer = (src, box, from) => {
    const f = document.createElement('div');
    f.className = 'lx-flyer';
    const im = new Image(); im.src = src; im.alt = '';
    f.appendChild(im);
    Object.assign(f.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    if (from && G) G.set(im, from);
    body.appendChild(f);
    return f;
  };
  const lock = on => {
    if (on) {
      const sb = innerWidth - document.documentElement.clientWidth;
      if (sb > 0) body.style.paddingRight = sb + 'px';
      body.classList.add('lx-open');
    } else {
      body.classList.remove('lx-open');
      body.style.paddingRight = '';
    }
    outside.forEach(el => { el.inert = on; });
  };
  const inView = b => b.width > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth;

  function open(i, card) {
    if (isOpen || busy) return;
    const p = places[i];
    isOpen = true; busy = true; cur = i; imgK = 0; srcCard = card;
    sync(); // stops the rows and pauses the card drift where it is

    // measure the card before anything moves
    const cImg = $('.loc__img img', card);
    const cBox = rect($('.loc__img', card));
    const cName = $('.loc__name', card);
    const nBox = rect(cName);
    const nSize = parseFloat(getComputedStyle(cName).fontSize);
    const cDrift = driftOf(cImg);

    setInfo(p);
    layers.forEach(clearLayer);
    front = 0;
    load(layers[0], p.thumb, p.images[0], p.alt);
    layers[0].classList.add('is-cur');

    lx.hidden = false;
    lx.scrollTop = 0;
    lock(true);

    if (!G) {
      kmB.textContent = p.km;
      busy = false; closeBtn.focus({ preventScroll: true }); startShow();
      return;
    }

    const mBox = rect(media);
    const tBox = rect(title);
    const tSize = parseFloat(getComputedStyle(title).fontSize);
    const f = flyer(cImg.currentSrc || p.thumb, cBox, cDrift);
    card.classList.add('is-src');
    G.set(media, { opacity: 0 });
    kmB.textContent = '0';

    const land = () => {
      if (!f.isConnected) return;
      G.set(media, { opacity: 1 });
      f.remove();
      card.classList.remove('is-src');
      drift(layers[0]);
      busy = false;
      startShow();
    };
    openTl = G.timeline({ onComplete: () => { openTl = null; } })
      .fromTo('.lx__bg', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0)
      .to(f, { left: mBox.left, top: mBox.top, width: mBox.width, height: mBox.height, duration: 1.05, ease: 'expo.inOut' }, 0)
      .to(f.firstChild, { x: 0, y: 0, scale: 1, duration: 1.05, ease: 'expo.inOut' }, 0)
      .fromTo(title, { x: nBox.left - tBox.left, y: nBox.top - tBox.top, scale: nSize / tSize }, { x: 0, y: 0, scale: 1, duration: 1.05, ease: 'expo.inOut' }, 0)
      .fromTo(chrome, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.5)
      .fromTo([typeEl, kmWrap, descEl, mapEl], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.55)
      .add(() => countKm(p.km, 0), 0.6)
      .fromTo(thumbs, { opacity: 0, y: 14 }, { opacity: k => (k === i ? 1 : 0.42), y: 0, duration: 0.6, stagger: 0.025, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.65)
      .add(() => closeBtn.focus({ preventScroll: true }), 0.7)
      .add(land, 1.05);
  }

  function go(j, from) {
    if (!isOpen || busy) return;
    j = (j + N) % N;
    if (j === cur) return;
    const p = places[j], prevKm = places[cur].km;
    const dir = from === 'prev' ? -1 : 1;
    busy = true; stopShow(); cur = j; imgK = 0;

    if (!G) {
      setInfo(p); kmB.textContent = p.km;
      show(p.thumb, p.images[0], p.alt, 'instant').then(() => { busy = false; startShow(); });
      return;
    }
    const text = new Promise(res => {
      G.timeline({ onComplete: res })
        .to(info, { opacity: 0, y: -16, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, 0)
        .add(() => { setInfo(p); countKm(p.km, prevKm); })
        .fromTo(info, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    });
    let pic;
    const m = rect(media);
    if (from && from.nodeType === 1 && inView(m)) {
      // the thumbnail grows into the main photo
      const f = flyer(p.thumb, rect(from));
      pic = new Promise(res => {
        G.to(f, {
          left: m.left, top: m.top, width: m.width, height: m.height, duration: 0.95, ease: 'expo.inOut',
          onComplete: () => show(p.thumb, p.images[0], p.alt, 'instant').then(() => { f.remove(); res(); })
        });
      });
    } else {
      if (lx.scrollTop > 0) lx.scrollTo({ top: 0, behavior: 'smooth' });
      pic = show(p.thumb, p.images[0], p.alt, 'wipe', dir);
    }
    Promise.all([pic, text]).then(() => { busy = false; startShow(); });
  }

  // which card to fly back into: the one you opened, else the copy nearest the middle
  const nearest = i => {
    let best = null, bd = Infinity;
    $$(`.loc[data-i="${i}"]`, section).forEach(c => {
      const b = rect(c), d = Math.abs(b.left + b.width / 2 - innerWidth / 2);
      if (d < bd) { bd = d; best = c; }
    });
    return best;
  };
  const backTarget = i => {
    const p = places[i];
    if (byKeyboard) {
      const r = rows.find(r => r.track.contains(p.el));
      const b = rect(p.el);
      if (r && !reduce && (b.left < 0 || b.right > innerWidth)) reveal(r, p.el);
      return p.el;
    }
    if (srcCard && +srcCard.dataset.i === i && inView(rect(srcCard))) return srcCard;
    let card = nearest(i);
    const r = rows.find(r => r.track.contains(card));
    const b = rect(card);
    if (r && !reduce && (b.left < 0 || b.right > innerWidth)) {
      r.x += innerWidth / 2 - (b.left + b.width / 2); r.skew = 0; place(r);
      card = nearest(i);
    }
    return card;
  };

  function close() {
    if (!isOpen) return;
    if (openTl) { openTl.progress(1); openTl.kill(); openTl = null; }
    if (busy) return;
    busy = true; stopShow();
    const p = places[cur];
    const mBox = rect(media);
    const tBox = rect(title);
    const tSize = parseFloat(getComputedStyle(title).fontSize);
    const shown = layers[front];
    const src = shown.currentSrc || shown.src || p.thumb;
    const sDrift = G ? { scale: G.getProperty(shown, 'scale'), xPercent: G.getProperty(shown, 'xPercent') } : null;

    lock(false);
    // the viewer is still opaque, so the row can quietly bring the card on screen
    const card = backTarget(cur);
    const cBox = rect($('.loc__img', card));

    const finish = () => {
      lx.hidden = true;
      if (G) G.set([lx, $('.lx__bg', lx), media, thumbsBox, ...info, ...chrome, ...thumbs], { clearProps: 'all' });
      layers.forEach(clearLayer);
      if (kbTween) kbTween.kill();
      card.classList.remove('is-src');
      isOpen = false; busy = false;
      sync();
      if (byKeyboard) p.el.focus({ preventScroll: true });
    };

    if (!G || !inView(cBox)) {
      if (G) G.to(lx, { opacity: 0, duration: 0.45, ease: 'power2.out', onComplete: finish });
      else finish();
      return;
    }

    const cName = $('.loc__name', card);
    const nBox = rect(cName);
    const nSize = parseFloat(getComputedStyle(cName).fontSize);
    const cDrift = driftOf($('.loc__img img', card));

    if (kbTween) kbTween.pause();
    const f = flyer(src, mBox, sDrift);
    G.set(media, { opacity: 0 });
    card.classList.add('is-src');

    G.timeline({ onComplete: () => { f.remove(); finish(); } })
      .to([...chrome, typeEl, kmWrap, descEl, mapEl, thumbsBox], { opacity: 0, y: 14, duration: 0.35, stagger: 0.03, ease: 'power2.in' }, 0)
      .to('.lx__bg', { opacity: 0, duration: 0.75, ease: 'power2.inOut' }, 0.2)
      .to(f, { left: cBox.left, top: cBox.top, width: cBox.width, height: cBox.height, duration: 0.95, ease: 'expo.inOut' }, 0.05)
      .to(f.firstChild, { x: cDrift.x, y: cDrift.y, scale: cDrift.scale, xPercent: 0, duration: 0.95, ease: 'expo.inOut' }, 0.05)
      .to(title, { x: nBox.left - tBox.left, y: nBox.top - tBox.top, scale: nSize / tSize, duration: 0.95, ease: 'expo.inOut' }, 0.05);
  }

  /* ---------- wiring ---------- */
  section.addEventListener('click', e => {
    const card = e.target.closest('.loc');
    if (!card || suppressClick) return;
    byKeyboard = false;
    open(+card.dataset.i, card);
  });
  section.addEventListener('keydown', e => {
    const card = e.target.closest('.loc');
    if (!card || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    byKeyboard = true;
    open(+card.dataset.i, card);
  });
  closeBtn.addEventListener('click', close);
  $('.lx__bg', lx).addEventListener('click', close);
  $('.lx__prev', lx).addEventListener('click', () => go(cur - 1, 'prev'));
  $('.lx__next', lx).addEventListener('click', () => go(cur + 1, 'next'));
  window.addEventListener('keydown', e => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') go(cur + 1, 'next');
    else if (e.key === 'ArrowLeft') go(cur - 1, 'prev');
    else if (e.key === 'Tab') {
      const f = $$('button, a[href]', lx).filter(el => el.getClientRects().length);
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  // swipe the big photo
  let sx = null, sy = 0;
  media.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  media.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  });
  media.addEventListener('pointercancel', () => { sx = null; });

  /* ---------- entrance: rows sweep in and rush, then settle ---------- */
  if (G && window.ScrollTrigger) {
    G.registerPlugin(window.ScrollTrigger);
    rows.forEach((r, k) => {
      G.fromTo(r.row, { clipPath: r.dir < 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, delay: k * 0.15, ease: 'expo.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: r.row, start: 'top 88%', onEnter: () => { kick = 9; } }
      });
    });
    G.from('.near__also', { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.near__also', start: 'top 92%' } });
  }
})();
