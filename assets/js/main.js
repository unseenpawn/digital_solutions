const prefersReducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = prefersReducedMotionMedia.matches;
prefersReducedMotionMedia.addEventListener('change', (event) => {
  prefersReducedMotion = event.matches;
});

function logEvent(name, payload = {}) {
  if (window.console && typeof console.debug === 'function') {
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

function updateElementText(element, value) {
  if (element.dataset.i18nAttr) {
    element.setAttribute(element.dataset.i18nAttr, value);
  } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    if (element.dataset.i18nPlaceholder) {
      element.setAttribute('placeholder', value);
    } else {
      element.value = value;
    }
  } else {
    element.innerHTML = value;
  }
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
      updateElementText(el, value);
    }
  });

  document.querySelectorAll('[data-i18n-list]').forEach((list) => {
    const key = list.dataset.i18nList;
    const items = getValueFromPath(data, key);
    if (Array.isArray(items)) {
      const children = Array.from(list.querySelectorAll('[data-i18n-item]'));
      items.forEach((item, index) => {
        if (typeof item === 'string' && children[index]) {
          children[index].innerHTML = item;
        }
      });
    }
  });

  document.documentElement.lang = locale;
  currentLocale = locale;
  localStorage.setItem(localeStorageKey, locale);
  const langToggle = document.querySelector('[data-lang-toggle]');
  if (langToggle) {
    langToggle.textContent = locale.toUpperCase();
    langToggle.setAttribute('aria-expanded', 'false');
  }
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

function smoothScroll(event) {
  const href = event.currentTarget.getAttribute('href');
  if (href && href.startsWith('#')) {
    const target = document.querySelector(href);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }
}

document.querySelectorAll('[data-scroll]').forEach((link) => {
  link.addEventListener('click', smoothScroll);
});

const langToggleBtn = document.querySelector('[data-lang-toggle]');
const langMenu = document.querySelector('[data-lang-menu]');
let langMenuOpen = false;

function closeLangMenu() {
  if (!langMenu) return;
  langMenu.classList.add('visually-hidden');
  langMenuOpen = false;
  if (langToggleBtn) {
    langToggleBtn.setAttribute('aria-expanded', 'false');
  }
}

function openLangMenu() {
  if (!langMenu || !langToggleBtn) return;
  langMenu.classList.remove('visually-hidden');
  langMenuOpen = true;
  langToggleBtn.setAttribute('aria-expanded', 'true');
  const activeOption = langMenu.querySelector(`[data-lang-option="${currentLocale}"]`);
  (activeOption || langMenu.querySelector('button'))?.focus();
}

if (langToggleBtn && langMenu) {
  closeLangMenu();
  langToggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (langMenuOpen) {
      closeLangMenu();
    } else {
      openLangMenu();
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

  document.addEventListener('click', (event) => {
    if (!langMenuOpen) return;
    if (!langMenu.contains(event.target) && event.target !== langToggleBtn) {
      closeLangMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && langMenuOpen) {
      closeLangMenu();
      langToggleBtn.focus();
    }
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
    previousFocus?.focus();
  });
}

if (navbarToggler) {
  navbarToggler.addEventListener('click', () => {
    const expanded = navbarToggler.getAttribute('aria-expanded') === 'true';
    if (!expanded) {
      logEvent('nav_open', {});
    }
  });
}

function markActiveCTAButtons() {
  document.querySelectorAll('[data-cta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const source = btn.dataset.cta || 'unknown';
      logEvent('cta_click', { source });
    });
  });
}

markActiveCTAButtons();

const stickyCta = document.querySelector('[data-sticky-cta]');

const contactModal = document.querySelector('[data-contact-modal]');
let modalFocusElements = [];
let modalPreviousFocus = null;
let modalOpen = false;

function focusTrapModal(event) {
  if (!modalOpen || !modalFocusElements.length || event.key !== 'Tab') {
    return;
  }
  const first = modalFocusElements[0];
  const last = modalFocusElements[modalFocusElements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFormFeedbackStrings() {
  return getValueFromPath(translations[currentLocale] || translations[defaultLocale] || {}, 'formErrors') || {};
}

function showFeedback(el, message, type = 'error') {
  if (!el) return;
  el.classList.remove('visually-hidden');
  if (el.classList.contains('alert')) {
    el.classList.remove('alert-danger', 'alert-success', 'alert-info');
    el.classList.add(type === 'success' ? 'alert-success' : 'alert-danger', 'alert');
  } else {
    el.classList.toggle('success', type === 'success');
  }
  el.textContent = message;
}

function clearFeedback(el) {
  if (!el) return;
  el.classList.add('visually-hidden');
  el.textContent = '';
  el.classList.remove('alert-success', 'alert-danger', 'success');
}

function prepareForm(form) {
  const timestampField = form.querySelector('input[name="form_started_at"]');
  if (timestampField) {
    timestampField.value = Date.now().toString();
  }
}

function resetForm(form) {
  form.reset();
  prepareForm(form);
}

function openContactModal(source = 'unknown', preset = {}) {
  if (!contactModal) return;
  contactModal.hidden = false;
  contactModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modalPreviousFocus = document.activeElement;
  modalFocusElements = Array.from(contactModal.querySelectorAll('a, button, input, select, textarea')).filter((el) => !el.hasAttribute('disabled'));
  modalOpen = true;
  document.addEventListener('keydown', focusTrapModal);
  modalFocusElements[0]?.focus();
  if (stickyCta) {
    stickyCta.setAttribute('aria-hidden', 'true');
  }
  logEvent('contact_modal_open', { source });
  const modalForm = contactModal.querySelector('form[data-contact-form]');
  if (modalForm) {
    prepareForm(modalForm);
    if (preset.message) {
      const messageField = modalForm.querySelector('textarea[name="message"]');
      if (messageField && !messageField.value) {
        messageField.value = preset.message;
      }
    }
  }
}

function closeContactModal() {
  if (!contactModal) return;
  contactModal.hidden = true;
  contactModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', focusTrapModal);
  modalOpen = false;
  if (stickyCta) {
    stickyCta.setAttribute('aria-hidden', 'false');
  }
  modalPreviousFocus?.focus();
}

contactModal?.addEventListener('click', (event) => {
  if (event.target === contactModal) {
    closeContactModal();
  }
});

contactModal?.querySelector('[data-close-contact]')?.addEventListener('click', () => {
  closeContactModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalOpen) {
    closeContactModal();
  }
});

if (stickyCta) {
  stickyCta.addEventListener('click', () => {
    openContactModal('sticky');
  });
}

document.querySelectorAll('[data-open-contact]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    const source = trigger.dataset.ctaSource || 'unknown';
    if (trigger.tagName === 'BUTTON') {
      event.preventDefault();
    }
    openContactModal(source);
  });
});

const qualifierForm = document.querySelector('[data-qualifier-form]');
if (qualifierForm) {
  qualifierForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!qualifierForm.checkValidity()) {
      qualifierForm.reportValidity();
      return;
    }
    const formData = new FormData(qualifierForm);
    const presetMessage = `Budget: ${formData.get('qualifier-budget')}, Timeline: ${formData.get('qualifier-timeline')}, Projekt: ${formData.get('qualifier-type')}`;
    logEvent('qualifier_submit', {
      budget: formData.get('qualifier-budget'),
      timeline: formData.get('qualifier-timeline'),
      project: formData.get('qualifier-type'),
    });
    openContactModal('qualifier', { message: presetMessage });
  });
}

const contactForms = document.querySelectorAll('form[data-contact-form]');

contactForms.forEach((form) => {
  prepareForm(form);
  const feedback = form.querySelector('[data-form-feedback]');
  const inputs = Array.from(form.querySelectorAll('input, textarea, select'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedbackStrings = getFormFeedbackStrings();
    clearFeedback(feedback);
    inputs.forEach((input) => {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    });

    if (!form.checkValidity()) {
      form.reportValidity();
      const firstInvalid = inputs.find((input) => !input.checkValidity());
      firstInvalid?.focus();
      showFeedback(feedback, feedbackStrings.generic || 'Bitte Eingaben prüfen.', 'error');
      return;
    }

    const formData = new FormData(form);
    if (!formData.get('form_started_at')) {
      formData.set('form_started_at', Date.now().toString());
    }
    if (!formData.get('context')) {
      formData.set('context', form.dataset.context || 'page');
    }

    try {
      const response = await fetch(form.action || '/kontakt.php', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Network error');
      }
      const payload = await response.json();
      if (payload.ok) {
        showFeedback(feedback, feedbackStrings.success || 'Danke! Wir melden uns in Kürze.', 'success');
        logEvent('contact_submit', { context: formData.get('context'), status: 'success' });
        resetForm(form);
        inputs[0]?.focus();
      } else {
        const errors = payload.errors || {};
        const errorMessages = Object.values(errors);
        if (errorMessages.length) {
          showFeedback(feedback, errorMessages[0], 'error');
          Object.keys(errors).forEach((name) => {
            const field = form.querySelector(`[name="${name}"]`);
            if (field) {
              field.classList.add('is-invalid');
              field.setAttribute('aria-invalid', 'true');
            }
          });
          const firstInvalid = Object.keys(errors)[0];
          form.querySelector(`[name="${firstInvalid}"]`)?.focus();
        } else {
          showFeedback(feedback, feedbackStrings.generic || 'Bitte Eingaben prüfen.', 'error');
        }
        logEvent('contact_submit', { context: formData.get('context'), status: 'error' });
      }
    } catch (error) {
      logEvent('contact_submit', { context: formData.get('context'), status: 'fallback' });
      if (feedback) {
        showFeedback(feedback, feedbackStrings.generic || 'Bitte Eingaben prüfen.', 'error');
      } else {
        form.submit();
      }
    }
  });
});

const techTablist = document.querySelector('[data-tech-tablist]');
if (techTablist) {
  const tabs = Array.from(techTablist.querySelectorAll('[data-tech-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-tech-panel]'));
  let activeIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  if (activeIndex < 0) activeIndex = 0;

  function activateTab(index) {
    tabs.forEach((tab, idx) => {
      const selected = idx === index;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });
    panels.forEach((panel, idx) => {
      if (idx === index) {
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    });
    activeIndex = index;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activateTab(index);
    });
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const newIndex = (activeIndex + offset + tabs.length) % tabs.length;
        activateTab(newIndex);
        tabs[newIndex].focus();
      }
    });
  });

  activateTab(activeIndex);
}

const slider = document.querySelector('[data-slider]');
if (slider) {
  const track = slider.querySelector('[data-slider-track]');
  const slides = Array.from(track.children);
  const dots = Array.from(slider.querySelectorAll('[data-slider-dot]'));
  let index = 0;
  let autoplay = !prefersReducedMotion;
  let timer;

  function updateSlider(newIndex) {
    index = newIndex;
    const offset = -(index * 100);
    track.style.transform = `translateX(${offset}%)`;
    slides.forEach((slide, idx) => {
      slide.setAttribute('aria-hidden', idx === index ? 'false' : 'true');
      slide.tabIndex = idx === index ? 0 : -1;
    });
    dots.forEach((dot, idx) => {
      dot.setAttribute('aria-pressed', idx === index ? 'true' : 'false');
    });
  }

  function nextSlide() {
    updateSlider((index + 1) % slides.length);
  }

  function startAutoplay() {
    if (autoplay && !prefersReducedMotion) {
      stopAutoplay();
      timer = window.setInterval(nextSlide, 6000);
    }
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      updateSlider(idx);
    });
  });

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin', stopAutoplay);
  slider.addEventListener('focusout', startAutoplay);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      autoplay = false;
      stopAutoplay();
    }
  });

  updateSlider(0);
  startAutoplay();
}

const caseFilterContainer = document.querySelector('[data-case-filter]');
if (caseFilterContainer) {
  const filterButtons = Array.from(caseFilterContainer.querySelectorAll('[data-filter]'));
  const caseItems = Array.from(document.querySelectorAll('[data-case-item]'));

  function applyFilter(filter) {
    filterButtons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    caseItems.forEach((item) => {
      const tags = (item.dataset.tags || '').split(' ');
      const matches = filter === 'alle' || tags.includes(filter);
      item.hidden = !matches;
    });
  }

  function setFilter(filter) {
    applyFilter(filter);
    const hash = `filter=${encodeURIComponent(filter)}`;
    if (window.location.hash !== `#${hash}`) {
      history.replaceState(null, '', `#${hash}`);
    }
  }

  function parseHash() {
    const match = window.location.hash.match(/filter=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : 'alle';
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'alle';
      setFilter(filter);
    });
  });

  window.addEventListener('hashchange', () => {
    const filter = parseHash();
    applyFilter(filter);
  });

  applyFilter(parseHash());
}

logEvent('page_loaded', { page: document.documentElement.dataset.page });
