(() => {
  const body = document.body;
  const buttons = document.querySelectorAll('.vp button');
  const set = (v) => {
    body.dataset.vp = v;
    try { localStorage.setItem('drz-variants-vp', v); } catch (e) { /* storage may be blocked */ }
  };
  buttons.forEach((b) => b.addEventListener('click', () => set(b.dataset.v)));
  try {
    const saved = localStorage.getItem('drz-variants-vp');
    if (saved === 'mobile' || saved === 'desktop') body.dataset.vp = saved;
  } catch (e) { /* ignore */ }
  const links = [...document.querySelectorAll('.chrome nav a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.toggle('on', l.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((s) => s && io.observe(s));
})();
