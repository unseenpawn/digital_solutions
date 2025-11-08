const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function logEvent(name, payload = {}) {
  if (window.console && console.debug) {
    console.debug('[analytics]', name, payload);
  }
}

const translationsElement = document.getElementById('translations');
let translations = {};
if (translationsElement) {
  try {
    translations = JSON.parse(translationsElement.textContent.trim());
  } catch (error) {
    console.error('Translation JSON invalid', error);
  }
}

const localeStorageKey = 'ds-locale';
const defaultLocale = document.documentElement.lang || 'de';
let currentLocale = localStorage.getItem(localeStorageKey) || defaultLocale;

function getValueFromPath(source, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, source);
}

function applyTranslations(locale) {
  const data = translations[locale];
  if (!data) {
    return;
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const value = getValueFromPath(data, key);
    if (typeof value === 'string') {
      if ('placeholder' in el.dataset) {
        el.setAttribute('placeholder', value);
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.setAttribute('aria-label', value);
        if (el.tagName === 'SELECT') {
          el.querySelectorAll('option').forEach((option) => {
            const optionKey = option.dataset.i18n;
            if (optionKey) {
              const optionValue = getValueFromPath(data, optionKey);
              if (typeof optionValue === 'string') {
                option.textContent = optionValue;
              }
            }
          });
        }
      } else {
        el.innerHTML = value;
      }
    }
  });

  document.querySelectorAll('[data-i18n-list]').forEach((list) => {
    const key = list.dataset.i18nList;
    const items = getValueFromPath(data, key);
    if (Array.isArray(items)) {
      list.querySelectorAll('[data-i18n-item]').forEach((item, index) => {
        if (typeof items[index] === 'string') {
          item.innerHTML = items[index];
        }
      });
    }
  });

  const langToggle = document.querySelector('[data-lang-toggle]');
  if (langToggle) {
    langToggle.textContent = locale.toUpperCase();
  }

  document.documentElement.lang = locale;
  currentLocale = locale;
  localStorage.setItem(localeStorageKey, locale);
  logEvent('locale_change', { locale });
}

if (translations[currentLocale]) {
  applyTranslations(currentLocale);
} else if (translations[defaultLocale]) {
  currentLocale = defaultLocale;
  applyTranslations(defaultLocale);
}

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear().toString();
});

const smoothScrollLinks = document.querySelectorAll('[data-scroll]');
smoothScrollLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }
  });
});

const langToggleBtn = document.querySelector('[data-lang-toggle]');
const langMenu = document.querySelector('[data-lang-menu]');
let langMenuOpen = false;

function closeLangMenu() {
  if (!langMenu) return;
  langMenu.classList.add('visually-hidden');
  langMenuOpen = false;
}

function openLangMenu() {
  if (!langMenu || !langToggleBtn) return;
  const rect = langToggleBtn.getBoundingClientRect();
  langMenu.style.top = `${rect.bottom + window.scrollY + 8}px`;
  langMenu.style.left = `${rect.left + window.scrollX}px`;
  langMenu.classList.remove('visually-hidden');
  langMenuOpen = true;
}

if (langToggleBtn && langMenu) {
  langToggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (langMenuOpen) {
      closeLangMenu();
    } else {
      openLangMenu();
      const activeOption = langMenu.querySelector(`[data-lang-option="${currentLocale}"]`);
      (activeOption || langMenu.querySelector('button'))?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!langMenuOpen) return;
    if (!langMenu.contains(event.target) && event.target !== langToggleBtn) {
      closeLangMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLangMenu();
      langToggleBtn.focus();
    }
  });

  langMenu.querySelectorAll('[data-lang-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const locale = btn.dataset.langOption;
      if (locale && translations[locale]) {
        applyTranslations(locale);
        closeLangMenu();
        langToggleBtn.focus();
      }
    });
  });
}

const navCta = document.querySelector('[data-nav-cta]');
if (navCta) {
  navCta.addEventListener('click', () => {
    window.location.href = '/kontakt.html';
  });
}

const navbarCollapse = document.getElementById('mainNav');
const navbarToggler = document.querySelector('.navbar-toggler');
let collapseFocusElements = [];
let previousFocus = null;

function trapFocus(event) {
  if (!collapseFocusElements.length) return;
  if (event.key !== 'Tab') return;
  const first = collapseFocusElements[0];
  const last = collapseFocusElements[collapseFocusElements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

if (navbarCollapse) {
  navbarCollapse.addEventListener('shown.bs.collapse', () => {
    collapseFocusElements = Array.from(navbarCollapse.querySelectorAll('a, button')).filter((el) => !el.hasAttribute('disabled'));
    previousFocus = document.activeElement;
    document.addEventListener('keydown', trapFocus);
    collapseFocusElements[0]?.focus();
  });

  navbarCollapse.addEventListener('hidden.bs.collapse', () => {
    document.removeEventListener('keydown', trapFocus);
    collapseFocusElements = [];
    previousFocus?.focus?.();
  });
}

if (navbarToggler) {
  navbarToggler.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const collapseInstance = bootstrap.Collapse.getInstance(navbarCollapse);
      collapseInstance?.hide();
    }
  });
}

const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('[data-tab-panel]');
if (tabButtons.length && tabPanels.length) {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabButtons.forEach((button) => {
        button.classList.toggle('active', button === btn);
        button.setAttribute('aria-selected', button === btn ? 'true' : 'false');
      });
      tabPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.tabPanel === target);
        panel.hidden = panel.dataset.tabPanel !== target;
      });
      logEvent('tab_switch', { target });
    });
  });
}

const testimonialSlider = document.querySelector('[data-slider]');
if (testimonialSlider) {
  const track = testimonialSlider.querySelector('[data-slider-track]');
  const slides = Array.from(track.querySelectorAll('.testimonial'));
  const prev = testimonialSlider.querySelector('[data-slider-prev]');
  const next = testimonialSlider.querySelector('[data-slider-next]');
  let index = 0;

  function updateSlides(newIndex) {
    index = (newIndex + slides.length) % slides.length;
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === index);
      slide.setAttribute('aria-hidden', idx === index ? 'false' : 'true');
    });
  }

  updateSlides(0);

  prev?.addEventListener('click', () => {
    updateSlides(index - 1);
  });

  next?.addEventListener('click', () => {
    updateSlides(index + 1);
  });

  if (!prefersReducedMotion) {
    setInterval(() => {
      updateSlides(index + 1);
    }, 7000);
  }
}

const filterButtons = document.querySelectorAll('[data-filter]');
const projectGrid = document.querySelector('[data-project-grid]');
if (filterButtons.length && projectGrid) {
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tag = button.dataset.filter;
      filterButtons.forEach((btn) => {
        btn.classList.toggle('active', btn === button);
        btn.setAttribute('aria-selected', btn === button ? 'true' : 'false');
      });
      Array.from(projectGrid.children).forEach((card) => {
        const tags = (card.dataset.tags || '').split(' ');
        const visible = tag === 'all' || tags.includes(tag);
        card.hidden = !visible;
        card.style.display = visible ? '' : 'none';
      });
      logEvent('filter_change', { tag });
    });
  });
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const feedback = contactForm.querySelector('[data-form-feedback]');
  const submitBtn = contactForm.querySelector('[data-submit-btn]');
  const timestampInput = contactForm.querySelector('[data-timestamp]');
  if (timestampInput) {
    timestampInput.value = Math.floor(Date.now() / 1000);
  }

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.classList.add('was-validated');
      return;
    }

    contactForm.classList.remove('was-validated');
    feedback.classList.add('visually-hidden');
    feedback.classList.remove('alert-success', 'alert-danger');
    submitBtn.setAttribute('disabled', 'disabled');
    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.textContent;
    }
    submitBtn.textContent = '...';

    const formData = new FormData(contactForm);

    try {
      const response = await fetch('/kontakt.php', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      const result = await response.json();
      const success = Boolean(result.success);
      feedback.classList.remove('visually-hidden');
      feedback.classList.add(success ? 'alert-success' : 'alert-danger');
      feedback.textContent = result.message || (success ? 'Danke!' : 'Fehler');
      logEvent('contact_submit', { success });
      if (success) {
        contactForm.reset();
        if (timestampInput) {
          timestampInput.value = Math.floor(Date.now() / 1000);
        }
      }
    } catch (error) {
      feedback.classList.remove('visually-hidden');
      feedback.classList.add('alert-danger');
      feedback.textContent = 'Senden fehlgeschlagen. Bitte später erneut versuchen.';
      logEvent('contact_error', { error: error.message });
    } finally {
      submitBtn.removeAttribute('disabled');
      if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText;
      }
    }
  });
}

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

export {};
