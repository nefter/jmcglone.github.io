// Home motion layer: preloader, smooth scroll, scroll reveals, hero intro.
// Everything degrades gracefully: with reduced motion, without GSAP/Lenis,
// or without JS, all content stays visible.

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' &&
                 typeof window.ScrollTrigger !== 'undefined';

  /* ------------------------------------------------------------
   * Preloader (independent of GSAP so it can never trap the user)
   * ------------------------------------------------------------ */
  var preloader = null;

  function buildPreloader() {
    preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.setAttribute('aria-hidden', 'true');
    preloader.innerHTML =
      '<span class="preloader-name">Jonathan McGlone</span>' +
      '<span class="preloader-count">0</span>';
    document.body.appendChild(preloader);

    var count = preloader.querySelector('.preloader-count');
    var value = 0;
    var duration = prefersReducedMotion ? 150 : 1100;
    var t0 = performance.now();

    (function update(now) {
      var p = Math.min((now - t0) / duration, 1);
      // ease-out so the counter feels like a real load
      value = Math.round(100 * (1 - Math.pow(1 - p, 3)));
      count.textContent = value;
      if (p < 1) requestAnimationFrame(update);
    })(t0);
  }

  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('done');
    var node = preloader;
    setTimeout(function () { node.remove(); }, 700);
  }

  /* ------------------------------------------------------------
   * No motion (reduced motion or missing libs): quick preloader,
   * everything else stays static and visible.
   * ------------------------------------------------------------ */
  if (prefersReducedMotion || !hasGsap) {
    buildPreloader();
    setTimeout(hidePreloader, prefersReducedMotion ? 200 : 1200);
    return;
  }

  /* ------------------------------------------------------------
   * Full motion path
   * ------------------------------------------------------------ */
  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // Smooth scroll
  var lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // smooth anchor links (e.g. hero scroll cue)
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -60 });
      });
    });
  }

  // Hide hero pieces before the preloader lifts
  var heroPieces = document.querySelectorAll('[data-hero-reveal]');
  gsap.set(heroPieces, { opacity: 0, y: 34 });

  buildPreloader();

  var tl = gsap.timeline({ delay: 1.15 });
  tl.add(hidePreloader);
  tl.to(heroPieces, {
    opacity: 1,
    y: 0,
    duration: 1.0,
    stagger: 0.12,
    ease: 'power3.out'
  }, '-=0.35');

  // Scroll reveals
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.9,
      ease: 'power3.out',
      delay: parseFloat(el.getAttribute('data-reveal-delay') || '0'),
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // Magnetic hover on brand and buttons (fine pointers only)
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.navbar-brand, .btn').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - rect.left - rect.width / 2) * 0.25,
          y: (e.clientY - rect.top - rect.height / 2) * 0.25,
          duration: 0.4,
          ease: 'power2.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
})();
