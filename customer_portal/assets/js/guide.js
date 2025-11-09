document.addEventListener('DOMContentLoaded', () => {
  const smoothScrollTo = (selector) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const headerOffset = 80;
    const rect = target.getBoundingClientRect();
    const offset = rect.top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  };

  document.querySelectorAll('.guide-hero-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        event.preventDefault();
        smoothScrollTo(href);
      }
    });
  });

});

