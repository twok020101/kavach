// Sets the saved theme and text size before the first paint (see src/lib/theme.ts).
try {
  var t = localStorage.getItem('kavach.theme');
  var m = window.matchMedia('(prefers-color-scheme: dark)');
  var d = t === 'dark' || (t !== 'light' && m.matches);
  var e = document.documentElement;
  if (d) e.dataset.theme = 'dark';
  var s = localStorage.getItem('kavach.textScale');
  if (s === 'large' || s === 'xlarge') e.dataset.textScale = s;
} catch {}
