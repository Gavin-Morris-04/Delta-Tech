/* Deltara Tech: shared site script */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Nav: scrolled state ---------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Nav: mobile menu ---------- */
  var toggle = document.getElementById('menu-toggle');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    if (!toggle || !links) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('is-open', open);
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  /* ---------- Nav: current section ---------- */
  var navAnchors = links ? Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]')) : [];
  var tracked = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && tracked.length) {
    var current = null;
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) current = entry.target.id;
      });
      navAnchors.forEach(function (a) {
        if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    tracked.forEach(function (s) { secObs.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings that enter together
        var siblings = el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal') : [];
        var idx = Array.prototype.indexOf.call(siblings, el);
        el.style.transitionDelay = Math.min(Math.max(idx, 0) * 70, 350) + 'ms';
        el.classList.add('is-in');
        revObs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------- Hero: inventory demo ---------- */
  var app = document.getElementById('demo-app');
  var log = document.getElementById('demo-log');
  if (app && log && !reduceMotion) {
    var parts = {
      cap: { name: 'Capacitor 45/5 µF', qty: 5, low: 2 },
      con: { name: 'Contactor 40A', qty: 8, low: 3 },
      ref: { name: 'R-410A, 25 lb', qty: 2, low: 1 },
      mot: { name: 'Condenser fan motor', qty: 1, low: 1 }
    };
    // Each step nets back to the starting quantities so the loop never drifts.
    var script = [
      { who: 'T7', part: 'cap', d: -1, text: '<b>Truck 07</b> used 1 × Capacitor 45/5 µF · Job 4821' },
      { who: 'OF', part: 'mot', d: 1, text: '<b>Office</b> moved 1 × Condenser fan motor, Warehouse → Truck 07' },
      { who: 'T7', part: 'con', d: -2, text: '<b>Truck 07</b> used 2 × Contactor 40A · Job 4822' },
      { who: 'T7', part: 'cap', d: -2, text: '<b>Truck 07</b> used 2 × Capacitor 45/5 µF · Job 4825' },
      { who: '!', alert: true, text: '<b>Low stock:</b> Capacitor 45/5 µF on Truck 07' },
      { who: 'OF', part: 'cap', d: 3, text: '<b>Office</b> restocked 3 × Capacitor 45/5 µF on Truck 07' },
      { who: 'T7', part: 'ref', d: -1, text: '<b>Truck 07</b> used 1 × R-410A · Job 4829' },
      { who: 'T7', part: 'mot', d: -1, text: '<b>Truck 07</b> used 1 × Condenser fan motor · Job 4831' },
      { who: 'OF', part: 'con', d: 2, text: '<b>Office</b> moved 2 × Contactor 40A, Warehouse → Truck 07' },
      { who: 'OF', part: 'ref', d: 1, text: '<b>Office</b> moved 1 × R-410A, Warehouse → Truck 07' }
    ];
    var clock = 0;            // simulated minutes
    var entries = [];         // { html, at }
    var step = 0;
    var timer = null;

    function rowFor(key) { return app.querySelector('tr[data-part="' + key + '"]'); }
    function paintPart(key, bump) {
      var p = parts[key], row = rowFor(key);
      if (!row) return;
      var q = row.querySelector('.qty'), chip = row.querySelector('.chip');
      q.textContent = p.qty;
      var isLow = p.qty <= p.low;
      chip.textContent = isLow ? 'Low' : 'OK';
      chip.classList.toggle('low', isLow);
      if (bump) { q.classList.remove('bump'); void q.offsetWidth; q.classList.add('bump'); }
    }
    function ago(at) {
      var m = clock - at;
      return m <= 0 ? 'now' : m + 'm';
    }
    function renderLog(fresh) {
      log.innerHTML = entries.map(function (e, i) {
        return '<li' + (i === 0 && fresh ? ' class="enter"' : '') + '><span class="who' + (e.alert ? ' alert' : '') + '">' + e.who + '</span><span>' + e.text + '</span><time>' + ago(e.at) + '</time></li>';
      }).join('');
    }
    function tick() {
      var ev = script[step % script.length];
      clock += 2 + (step % 3);
      if (ev.part) {
        parts[ev.part].qty += ev.d;
        paintPart(ev.part, true);
      }
      entries.unshift({ who: ev.who, text: ev.text, alert: !!ev.alert, at: clock });
      entries = entries.slice(0, 3);
      renderLog(true);
      step++;
    }
    function start() { if (!timer) timer = setInterval(tick, 3000); }
    function stop() { clearInterval(timer); timer = null; }

    // Seed with the same entries the static HTML shows
    clock = 21;
    entries = [
      { who: 'OF', text: '<b>Office</b> moved 6 × Contactor 40A, Warehouse → Truck 12', at: 13 },
      { who: '!', alert: true, text: '<b>Low stock:</b> Condenser fan motor on Truck 07', at: 0 }
    ];
    renderLog(false);

    var onScreen = true;
    function sync() { onScreen && !document.hidden ? start() : stop(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { onScreen = e.isIntersecting; });
        sync();
      }, { threshold: 0.3 }).observe(app);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ---------- Case study: table of contents ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var tocObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    tocLinks.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) tocObs.observe(t);
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-error', !!isError);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 6000);
  }

  /* ---------- Contact form (EmailJS) ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    if (window.emailjs) {
      try { window.emailjs.init('5iMRn1CalPdToSLI5'); } catch (e) { /* handled on submit */ }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Bots fill the hidden field; humans never see it.
      if (form.website && form.website.value) return;

      var name = form.elements.name, email = form.elements.email, message = form.elements.message;
      var problems = [];
      [name, email, message].forEach(function (f) { f.removeAttribute('aria-invalid'); });
      if (!name.value.trim()) problems.push(name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) problems.push(email);
      if (!message.value.trim()) problems.push(message);
      if (problems.length) {
        problems.forEach(function (f) { f.setAttribute('aria-invalid', 'true'); });
        problems[0].focus();
        toast(problems[0] === email ? 'Please enter a valid email address.' : 'Please fill in your name, email and a short message.', true);
        return;
      }

      var needs = Array.prototype.slice.call(form.querySelectorAll('input[name="need"]:checked')).map(function (c) { return c.value; });
      var industry = form.elements.industry.value;
      var body = 'Industry: ' + (industry || 'Not given') + '\n' +
                 'Needs: ' + (needs.length ? needs.join(', ') : 'Not given') + '\n\n' +
                 message.value.trim();

      var btn = form.querySelector('button[type="submit"]');
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      function done(ok) {
        btn.disabled = false;
        btn.innerHTML = label;
        if (ok) {
          form.reset();
          toast("Thanks, your message is in. We'll reply within one business day.");
        } else {
          toast("Couldn't send just now. Please email deltaratech@gmail.com directly.", true);
        }
      }

      if (!window.emailjs) { done(false); return; }
      window.emailjs.send('service_3a38f7a', 'template_ftc7b1v', {
        name: name.value.trim(),
        email: email.value.trim(),
        company: form.elements.company.value.trim(),
        message: body,
        to_email: 'deltaratech@gmail.com'
      }).then(function () { done(true); }, function () { done(false); });
    });
  }
})();
