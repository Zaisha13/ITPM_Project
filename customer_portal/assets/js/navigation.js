document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const currentPage = body.dataset.page || '';
  const isHomePage = currentPage === 'home';
  const isFileProtocol = window.location.protocol === 'file:';
  let homepageTarget = body.dataset.homepage || 'index.html';
  if (homepageTarget.toLowerCase().endsWith('.php')) {
    homepageTarget = homepageTarget.replace(/\.php$/i, '.html');
  }
  const headerOffset = Number(body.dataset.headerOffset || 80);

  const updateSectionLinks = (selector) => {
    document.querySelectorAll(selector).forEach((link) => {
      const section = link.dataset.section;
      if (!section) return;
      if (isHomePage) {
        link.setAttribute('href', `#${section}`);
      } else {
        link.setAttribute('href', `${homepageTarget}#${section}`);
      }
    });
  };

  updateSectionLinks('.nav-link[data-section]');
  updateSectionLinks('.footer-nav a[data-section]');

  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  navLinks.forEach((link) => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
  });

  if (isHomePage) {
    const homeLink = document.querySelector('.nav-link[data-section="home"]');
    if (homeLink) {
      homeLink.classList.add('active');
      homeLink.setAttribute('aria-current', 'page');
    }
  } else if (currentPage) {
    const pageLink = document.querySelector(`.nav-link[data-page="${currentPage}"]`);
    if (pageLink) {
      pageLink.classList.add('active');
      pageLink.setAttribute('aria-current', 'page');
    }
  }

  const smoothScrollTo = (hash) => {
    if (!hash) return;
    const target = document.querySelector(hash);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const offset = rect.top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  };

  if (isHomePage) {
    const handleSectionClick = (event) => {
      const link = event.currentTarget;
      const section = link.dataset.section;
      if (!section) return;
      event.preventDefault();
      smoothScrollTo(`#${section}`);
    };

    document.querySelectorAll('.nav-link[data-section]').forEach((link) => {
      link.addEventListener('click', handleSectionClick);
    });
    document.querySelectorAll('.footer-nav a[data-section]').forEach((link) => {
      link.addEventListener('click', handleSectionClick);
    });
  }
});

