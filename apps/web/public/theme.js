// Sets the saved theme and text size before the first paint (see src/lib/theme.ts), and marks a
// first visit to the landing page so the opening (components/kavach/boot.tsx) can play without a
// flash of the page underneath. The opening never runs on app or hospital routes, on a repeat
// visit in the same tab, or for people who asked for reduced motion.
try {
  var t = localStorage.getItem('kavach.theme');
  var m = window.matchMedia('(prefers-color-scheme: dark)');
  var d = t === 'dark' || (t !== 'light' && m.matches);
  var e = document.documentElement;
  if (d) e.dataset.theme = 'dark';
  var s = localStorage.getItem('kavach.textScale');
  if (s === 'large' || s === 'xlarge') e.dataset.textScale = s;
  var landing = /^\/(en|hi)?\/?$/.test(location.pathname);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Plays on the first visit in a tab and again on a refresh of the landing page; ?boot=1 forces
  // it; moving back to the landing from inside the app does not replay it; reduced motion skips it.
  var force = /[?&]boot=1(&|$)/.test(location.search);
  var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var reload = !!nav && nav.type === 'reload';
  if (landing && (force || (!reduced && (reload || !sessionStorage.getItem('kavach.booted'))))) {
    e.classList.add('booting');
  }
} catch {}
