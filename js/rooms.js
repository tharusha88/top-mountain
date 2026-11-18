/* Top Mountain Resort — room photo wall and room viewer
   Builds the wall from window.ROOMS_DATA (js/rooms-data.js): one cover photo per room,
   featured rooms first, the rest behind "See more rooms". Opening a room shows all of
   its photos in a full-screen viewer with the room's details. */
(() => {
  const data = window.ROOMS_DATA;
  const wallBox = document.querySelector('.rooms__wall');
  const viewer = document.getElementById('rv');
  if (!data || !wallBox || !viewer) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = !reduce && window.gsap ? window.gsap : null;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const big = (room, n) => `assets/img/rooms/${room.folder}/${n}.jpg`;
  const thumb = (room, n) => `assets/img/rooms/${room.folder}/t/${n}.jpg`;

  const rooms = [...data.rooms.filter(r => r.featured), ...data.rooms.filter(r => !r.featured)];

  /* ---------- the wall: a staggered photo wall with a category filter ---------- */
  const cats = data.categories;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const phone = matchMedia('(max-width: 899px), ((max-height: 559px) and (pointer: coarse))');
  const colCount = () => (phone.matches ? 2 : innerWidth < 1200 ? 3 : 4);
  const limit = () => (phone.matches ? 6 : colCount() * 2); // two rows before "See more"

  // filter: All + one tab per category that has rooms, in the order the categories are listed
  const counts = rooms.reduce((m, r) => { m[r.category] = (m[r.category] || 0) + 1; return m; }, {});
  const tabs = [['all', 'All rooms', rooms.length], ...Object.keys(cats).filter(k => counts[k]).map(k => [k, cats[k].name, counts[k]])];
  const filter = document.createElement('div');
  filter.className = 'rooms__filter';
  filter.setAttribute('role', 'group');
  filter.setAttribute('aria-label', 'Show rooms by type');
  filter.innerHTML = '<span class="rooms__pill" aria-hidden="true"></span>' +
    tabs.map(([k, label, n]) => `<button type="button" class="rooms__tab" data-cat="${k}" aria-pressed="${k === 'all'}">${esc(label)}<sup>${n}</sup></button>`).join('');
  wallBox.appendChild(filter);

  // one photo tile per room; the tiles are dealt into columns by layout()
  const wall = document.createElement('div');
  wall.className = 'rooms__list';
  wall.setAttribute('role', 'list');
  wallBox.appendChild(wall);
  const items = rooms.map((room, i) => {
    const c = cats[room.category] || {};
    const n = room.photos.length;
    const el = document.createElement('div');
    el.className = 'room';
    el.setAttribute('role', 'listitem');
    el.dataset.cat = room.category;
    el.innerHTML = `
      <button type="button" class="room__btn" data-i="${i}" aria-label="${esc(room.name)}, ${esc(c.name || '')}. Open all ${n} photos">
        <img class="room__img is-on" src="${thumb(room, room.photos[0])}" srcset="${thumb(room, room.photos[0])} 520w, ${big(room, room.photos[0])} 1600w" sizes="(min-width:1200px) 23vw, (min-width:900px) 31vw, 46vw" alt="" loading="lazy">
        ${n > 1 ? `<span class="room__dots" aria-hidden="true">${room.photos.slice(0, 8).map((_, j) => `<i${j ? '' : ' class="is-on"'}></i>`).join('')}</span>` : ''}
        <span class="room__info">
          <span class="room__cat">${esc(c.name || '')}</span>
          <span class="room__name">${esc(room.name)}</span>
          <span class="room__more">${c.from ? `From ${esc(c.from)}` : ''}${c.from && n > 1 ? ' · ' : ''}${n > 1 ? `${n} photos` : ''}</span>
        </span>
      </button>`;
    return el;
  });

  const toggle = $('.rooms__toggle');
  const moreBox = toggle && toggle.parentNode;
  let current = 'all', expanded = false, cols = [], drift = [];

  // deal the visible tiles into columns, left to right; shapes alternate so the columns stagger
  const layout = () => {
    const n = colCount();
    const match = items.filter(el => current === 'all' || el.dataset.cat === current);
    const max = expanded ? Infinity : limit();
    items.forEach(el => { el.hidden = !match.includes(el) || match.indexOf(el) >= max; });
    const visible = match.filter(el => !el.hidden);

    if (cols.length !== n) {
      drift.forEach(t => t.kill());
      drift = [];
      cols.forEach(c => c.remove());
      cols = Array.from({ length: n }, (_, k) => {
        const c = document.createElement('div');
        c.className = 'rooms__col';
        c.setAttribute('role', 'presentation');
        wall.appendChild(c);
        // desktop: neighbouring columns drift at different speeds as the wall scrolls by
        if (G && window.ScrollTrigger && !phone.matches) {
          drift.push(G.fromTo(c, { y: k % 2 ? 50 : 10 }, {
            y: k % 2 ? -50 : -10, ease: 'none',
            scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: true }
          }));
        }
        return c;
      });
    }
    visible.forEach((el, i) => {
      const col = i % n, row = Math.floor(i / n);
      el.style.setProperty('--ar', (row + col) % 2 ? '1 / 1' : '4 / 3');
      cols[col].appendChild(el);
    });
    items.filter(el => el.hidden).forEach(el => cols[n - 1].appendChild(el));

    if (moreBox) {
      const extra = match.length - limit();
      moreBox.hidden = extra <= 0;
      toggle.textContent = expanded ? 'See fewer rooms' : `See more rooms · ${extra}`;
      toggle.setAttribute('aria-expanded', expanded);
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh(); // page height changed: later scroll effects re-measure
  };
  const shown = () => items.filter(el => !el.hidden);
  const rise = els => {
    if (!G || !els.length) return;
    G.fromTo(els, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.05, clearProps: 'opacity,transform' });
  };

  // sliding highlight behind the active tab
  const pill = $('.rooms__pill', filter);
  const placePill = () => {
    const on = $('.rooms__tab[aria-pressed="true"]', filter);
    if (!on) return;
    pill.style.width = on.offsetWidth + 'px';
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  filter.addEventListener('click', e => {
    const tab = e.target.closest('.rooms__tab');
    if (!tab || tab.dataset.cat === current) return;
    $$('.rooms__tab', filter).forEach(t => t.setAttribute('aria-pressed', t === tab));
    placePill();
    current = tab.dataset.cat;
    expanded = false;
    if (!G) { layout(); return; }
    G.to(shown(), {
      opacity: 0, y: 14, scale: 0.98, duration: 0.22, ease: 'power2.in', stagger: 0.012, overwrite: true,
      onComplete: () => { layout(); rise(shown()); }
    });
  });
  if (toggle) toggle.addEventListener('click', () => {
    const before = shown();
    expanded = !expanded;
    layout();
    if (expanded) rise(shown().filter(el => !before.includes(el)));
    else $('#rooms').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  let rt = 0, lastCols = colCount();
  window.addEventListener('resize', () => {
    placePill();
    clearTimeout(rt);
    rt = setTimeout(() => { if (colCount() !== lastCols) { lastCols = colCount(); layout(); } }, 150);
  });
  layout();
  placePill();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);

  // hover: the tile quietly cycles through the room's other photos
  if (fine && !reduce) items.forEach(el => {
    const room = rooms[+$('.room__btn', el).dataset.i];
    if (room.photos.length < 2) return;
    const dots = $$('.room__dots i', el);
    let layers = null, k = 0, wait = 0, timer = 0;
    const build = () => {
      layers = [$('.room__img', el)];
      room.photos.slice(1, 8).forEach(n => {
        const im = document.createElement('img');
        im.className = 'room__img'; im.alt = ''; im.decoding = 'async';
        im.src = thumb(room, n);
        layers[layers.length - 1].after(im);
        layers.push(im);
      });
    };
    const go = j => {
      layers[k].classList.remove('is-on');
      k = j % layers.length;
      layers[k].classList.add('is-on');
      dots.forEach((d, x) => d.classList.toggle('is-on', x === k));
    };
    el.addEventListener('mouseenter', () => {
      if (!layers) build();
      wait = setTimeout(() => { go(k + 1); timer = setInterval(() => go(k + 1), 1400); }, 450);
    });
    el.addEventListener('mouseleave', () => { clearTimeout(wait); clearInterval(timer); if (layers) go(0); });
  });

  // first tiles rise in, their photos uncovering, as the wall scrolls into view
  if (G && window.ScrollTrigger) {
    G.registerPlugin(window.ScrollTrigger);
    const first = shown();
    const btns = first.map(el => $('.room__btn', el));
    G.set(first, { opacity: 0, y: 50 });
    window.ScrollTrigger.create({
      trigger: wall, start: 'top 85%', once: true,
      onEnter: () => {
        G.to(first, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform' });
        G.fromTo(btns, { clipPath: 'inset(24% 0% 0% 0% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 1.3, ease: 'power3.out', stagger: 0.07, clearProps: 'clipPath' });
      }
    });
  }

  /* ---------- the viewer ---------- */
  const img = $('.rv__img', viewer);
  const count = $('.rv__count', viewer);
  const cat = $('.rv__cat', viewer);
  const title = $('.rv__title', viewer);
  const specs = $('.rv__specs', viewer);
  const price = $('.rv__price', viewer);
  const thumbs = $('.rv__thumbs', viewer);
  const closeBtn = $('.rv__close', viewer);
  const book = $('.rv__book', viewer);
  const outside = $$('body > header, body > main, body > footer, #menu');
  let room = null, k = 0, opener = null;

  const preload = n => { const im = new Image(); im.src = big(room, room.photos[(n + room.photos.length) % room.photos.length]); };
  const show = (n, first) => {
    k = (n + room.photos.length) % room.photos.length;
    const src = big(room, room.photos[k]);
    count.textContent = `${String(k + 1).padStart(2, '0')} / ${String(room.photos.length).padStart(2, '0')}`;
    img.alt = `${room.name}, photo ${k + 1} of ${room.photos.length}`;
    $$('.rv__thumb', thumbs).forEach((t, j) => { t.classList.toggle('is-on', j === k); t.setAttribute('aria-current', j === k ? 'true' : 'false'); });
    const on = $('.rv__thumb.is-on', thumbs);
    if (on) thumbs.scrollTo({ left: on.offsetLeft - thumbs.clientWidth / 2 + on.offsetWidth / 2, behavior: first || reduce ? 'auto' : 'smooth' });
    img.classList.remove('is-in');
    const swap = () => { img.src = src; (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => img.classList.add('is-in')); };
    if (first) swap(); else setTimeout(swap, 180);
    preload(k + 1); preload(k - 1);
  };

  const open = (i, from) => {
    room = rooms[i]; opener = from;
    const c = data.categories[room.category] || {};
    cat.textContent = c.name || '';
    title.textContent = room.name;
    specs.innerHTML = [['Size', c.size], ['Guests', c.guests], ['View', c.view]].filter(r => r[1])
      .map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${esc(dd)}</dd></div>`).join('');
    price.innerHTML = c.from ? `<span>From</span>${esc(c.from)}` : '';
    thumbs.innerHTML = room.photos.map((n, j) => `<button type="button" class="rv__thumb" data-k="${j}" aria-label="Photo ${j + 1}"><img src="${thumb(room, n)}" alt=""></button>`).join('');
    viewer.hidden = false;
    document.body.classList.add('rv-open');
    outside.forEach(el => { el.inert = true; });
    show(room.photos.length > 1 ? 1 : 0, true); // the cover is already on the wall, so start with the next photo
    void viewer.offsetWidth; // apply the hidden state first so the fade-in runs
    viewer.classList.add('is-open');
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (viewer.hidden) return;
    viewer.classList.remove('is-open');
    document.body.classList.remove('rv-open');
    outside.forEach(el => { el.inert = false; });
    setTimeout(() => { viewer.hidden = true; img.removeAttribute('src'); img.classList.remove('is-in'); }, reduce ? 0 : 350);
    if (opener) opener.focus({ preventScroll: true });
  };

  wall.addEventListener('click', e => {
    const b = e.target.closest('.room__btn');
    if (b) open(+b.dataset.i, b);
  });
  thumbs.addEventListener('click', e => {
    const t = e.target.closest('.rv__thumb');
    if (t) show(+t.dataset.k);
  });
  $('.rv__prev', viewer).addEventListener('click', () => show(k - 1));
  $('.rv__next', viewer).addEventListener('click', () => show(k + 1));
  closeBtn.addEventListener('click', close);
  $('.rv__bg', viewer).addEventListener('click', close);
  // "Enquire" closes the viewer and picks this room's type in the booking form
  book.addEventListener('click', () => {
    const c = data.categories[room.category];
    const sel = document.querySelector('.bform select[name="stay"]');
    if (c && sel && [...sel.options].some(o => o.text === c.name)) sel.value = c.name;
    close();
  });
  window.addEventListener('keydown', e => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') show(k + 1);
    else if (e.key === 'ArrowLeft') show(k - 1);
    else if (e.key === 'Tab') {
      const f = $$('button, a[href]', viewer).filter(el => el.getClientRects().length);
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  // swipe the big photo
  let sx = null, sy = 0;
  const stage = $('.rv__stage', viewer);
  stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(k + (dx < 0 ? 1 : -1));
  });
})();
