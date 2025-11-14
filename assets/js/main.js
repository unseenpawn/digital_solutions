import { routes, endpoints } from './config.js';

const SITE_BASE_RAW = window.__SITE_BASE__ || '';
const SITE_BASE = SITE_BASE_RAW.replace(/\/+$/, '');
const SITE_BASE_WITH_SLASH = SITE_BASE ? `${SITE_BASE}/` : '';

function isExternalUrl(value = '') {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:');
}

function prefixSitePath(value = '') {
  if (!value || value === '.' || value.startsWith('#') || isExternalUrl(value)) {
    return value;
  }
  const [beforeHash, hashPart] = value.split('#');
  const [pathPart, searchPart] = beforeHash.split('?');
  const normalisedPath = pathPart.replace(/^\.\/?/, '').replace(/^\/+/, '');
  const query = searchPart ? `?${searchPart}` : '';
  const hash = hashPart ? `#${hashPart}` : '';
  if (!SITE_BASE_WITH_SLASH) {
    const preservedPath = pathPart && pathPart.startsWith('/') ? pathPart : normalisedPath;
    return `${preservedPath}${query}${hash}`;
  }
  if (beforeHash.startsWith(SITE_BASE_WITH_SLASH) || beforeHash === SITE_BASE) {
    return `${beforeHash}${hash}`;
  }
  return `${SITE_BASE_WITH_SLASH}${normalisedPath}${query}${hash}`;
}

function appendLocaleParam(url, locale = '') {
  const activeLocale = locale || currentLocale;
  if (!url || !activeLocale || activeLocale === defaultLocale || url.startsWith('#') || isExternalUrl(url)) {
    return url;
  }
  const [beforeHash, hashPart] = url.split('#');
  const [pathPart, searchPart] = beforeHash.split('?');
  const params = new URLSearchParams(searchPart || '');
  if (!params.has('lang')) {
    params.set('lang', activeLocale);
  }
  const query = params.toString();
  const hash = hashPart ? `#${hashPart}` : '';
  return `${pathPart}${query ? `?${query}` : ''}${hash}`;
}

function formatInternalLink(value = '', options = {}) {
  const { includeLocale = true } = options;
  let url = prefixSitePath(value);
  if (includeLocale) {
    url = appendLocaleParam(url);
  }
  return url;
}

function syncLocaleToUrl(locale) {
  const url = new URL(window.location.href);
  if (locale && locale !== defaultLocale) {
    url.searchParams.set('lang', locale);
  } else {
    url.searchParams.delete('lang');
  }
  const newUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', newUrl);
}

function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

function resolveSeoUrl(path = '/') {
  if (!path) {
    return SEO_CANONICAL_HOST;
  }
  if (isExternalUrl(path)) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${SEO_CANONICAL_HOST}${path}`;
  }
  return `${SEO_CANONICAL_HOST}/${path}`;
}

function applySeoHosts() {
  const canonical = document.querySelector('[data-canonical-path]');
  if (canonical) {
    const localeSuffix = currentLocale ? `${currentLocale.charAt(0).toUpperCase()}${currentLocale.slice(1)}` : '';
    const localeKey = localeSuffix ? `canonicalPath${localeSuffix}` : '';
    const localePath = localeKey && canonical.dataset[localeKey];
    const path = localePath || canonical.dataset.canonicalPath || '/';
    canonical.setAttribute('href', resolveSeoUrl(path));
  }
  document.querySelectorAll('[data-hreflang-path]').forEach((link) => {
    const lang = link.getAttribute('hreflang');
    const path = link.dataset.hreflangPath || SEO_HREFLANG_PATHS[lang] || '/';
    link.setAttribute('href', resolveSeoUrl(path));
  });
}

const prefersReducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = prefersReducedMotionMedia.matches;
const revealTargets = [];
let revealObserver = null;

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
const storedLocale = localStorage.getItem(localeStorageKey);
const queryLocale = new URLSearchParams(window.location.search).get('lang');
let currentLocale = queryLocale || storedLocale || defaultLocale;

const themeStorageKey = 'ds-theme';
const defaultThemeName = 'light';
const supportedThemes = new Set(['light', 'dark']);
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const themeToggleButton = document.querySelector('[data-theme-toggle]');
const themeToggleText = themeToggleButton?.querySelector('[data-theme-toggle-text]');
const themeToggleIcon = themeToggleButton?.querySelector('[data-theme-toggle-icon]');
const themeToggleLabels = {
  de: { light: 'Hell', dark: 'Dunkel' },
  en: { light: 'Light', dark: 'Dark' },
};
const themeToggleIcons = {
  light: '☀',
  dark: '☾',
};
let currentTheme = defaultThemeName;
const langToggleButton = document.querySelector('[data-lang-toggle]');
const languageToggleLabels = {
  de: { button: 'EN', aria: 'Auf Englisch wechseln' },
  en: { button: 'DE', aria: 'Switch language to German' },
};
const SEO_CANONICAL_HOST = 'https://www.digital-solutions.swiss';
const SEO_HREFLANG_PATHS = {
  de: '/',
  en: '/?lang=en',
};

function updateThemeColorMeta(theme) {
  if (themeColorMeta) {
    const themeColor = theme === 'dark' ? '#0f1729' : '#0b6efd';
    themeColorMeta.setAttribute('content', themeColor);
  }
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function updateThemeToggleState(theme) {
  if (!themeToggleButton) return;
  const labels = themeToggleLabels[currentLocale] || themeToggleLabels[defaultLocale] || themeToggleLabels.de;
  themeToggleButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  if (themeToggleText) {
    themeToggleText.textContent = theme === 'dark' ? labels.dark : labels.light;
  }
  if (themeToggleIcon) {
    themeToggleIcon.textContent = themeToggleIcons[theme] || themeToggleIcons.light;
  }
}

function getNextLocale(locale = currentLocale) {
  return locale === 'de' ? 'en' : 'de';
}

function updateLanguageToggleUI() {
  if (!langToggleButton) return;
  const config = languageToggleLabels[currentLocale] || languageToggleLabels[defaultLocale] || languageToggleLabels.de;
  langToggleButton.textContent = config.button;
  langToggleButton.setAttribute('aria-label', config.aria);
  langToggleButton.setAttribute('aria-pressed', currentLocale === defaultLocale ? 'false' : 'true');
  langToggleButton.dataset.targetLocale = getNextLocale();
}

function setTheme(theme, { save = true, emit = false } = {}) {
  const normalized = supportedThemes.has(theme) ? theme : defaultThemeName;
  document.documentElement.setAttribute('data-theme', normalized);
  currentTheme = normalized;
  if (save) {
    localStorage.setItem(themeStorageKey, normalized);
  }
  updateThemeColorMeta(normalized);
  updateThemeToggleState(normalized);
  if (emit) {
    logEvent('theme_change', { theme: normalized });
  }
}

const storedTheme = localStorage.getItem(themeStorageKey);
if (storedTheme && supportedThemes.has(storedTheme)) {
  setTheme(storedTheme, { save: false });
} else {
  localStorage.setItem(themeStorageKey, defaultThemeName);
  setTheme(defaultThemeName, { save: false });
}

themeToggleButton?.addEventListener('click', () => {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark', { emit: true });
});

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
  syncLocaleToUrl(locale);
  updateLanguageToggleUI();
  applyRoutingConfig();
  applySeoHosts();
  updateThemeToggleState(currentTheme);
  collectCountTargets();
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

function applyRoutingConfig() {
  document.querySelectorAll('[data-route]').forEach((el) => {
    const key = el.dataset.route;
    if (!key) return;
    const target = routes[key];
    if (target) {
      el.setAttribute('href', formatInternalLink(target));
    }
  });

  document.querySelectorAll('[data-endpoint]').forEach((form) => {
    const key = form.dataset.endpoint;
    if (!key) return;
    const target = endpoints[key];
    if (target) {
      form.setAttribute('action', prefixSitePath(target));
    }
  });

  document.querySelectorAll('[data-asset-src]').forEach((el) => {
    const assetTarget = el.dataset.assetSrc;
    if (!assetTarget) return;
    el.setAttribute('src', prefixSitePath(assetTarget));
  });

  document.querySelectorAll('[data-asset-href]').forEach((el) => {
    const assetTarget = el.dataset.assetHref;
    if (!assetTarget) return;
    el.setAttribute('href', prefixSitePath(assetTarget));
  });

  document.querySelectorAll('a[href]:not([data-route]):not([data-asset-href])').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || isExternalUrl(href)) return;
    anchor.setAttribute('href', formatInternalLink(href));
  });
}

onReady(() => {
  applyRoutingConfig();
  applySeoHosts();
  updateLanguageToggleUI();
  collectCountTargets();
  initStickyCtaVisibility();
});

if (langToggleButton) {
  langToggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    const targetLocale = langToggleButton.dataset.targetLocale || getNextLocale();
    if (targetLocale && translations[targetLocale]) {
      applyTranslations(targetLocale);
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
    navbarToggler?.setAttribute('aria-expanded', 'true');
  });

  navbarCollapse.addEventListener('hidden.bs.collapse', () => {
    document.removeEventListener('keydown', trapFocus);
    collapseFocusElements = [];
    previousFocus?.focus();
    navbarToggler?.setAttribute('aria-expanded', 'false');
  });
}

if (navbarCollapse && navbarToggler && (!navbarToggler.dataset.bsToggle || !navbarToggler.dataset.bsTarget)) {
  const CollapseConstructor = window.bootstrap?.Collapse;
  if (CollapseConstructor) {
    const manualCollapse = new CollapseConstructor(navbarCollapse, { toggle: false });
    navbarToggler.addEventListener('click', (event) => {
      event.preventDefault();
      const expanded = navbarToggler.getAttribute('aria-expanded') === 'true';
      manualCollapse.toggle();
      navbarToggler.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  }
}

if (navbarToggler) {
  navbarToggler.addEventListener('click', () => {
    const expanded = navbarToggler.getAttribute('aria-expanded') === 'true';
    if (!expanded) {
      logEvent('nav_open', {});
    }
  }, { capture: true });
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
const countTargetMap = new Map();
let countObserver = null;
let stickyCtaShouldShow = false;
let stickyCtaManualHidden = false;
let stickyCtaHeroInView = true;
let stickyCtaFooterInView = false;

function formatCountValue(value, config) {
  const decimals = Number.isFinite(config.decimals) ? config.decimals : 0;
  const locale = currentLocale === 'en' ? 'en-US' : 'de-CH';
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const formatted = formatter.format(value);
  const prefix = config.prefix || '';
  const suffix = config.suffix || '';
  return `${prefix}${formatted}${suffix}`;
}

function animateCount(config) {
  if (config.animated) {
    return;
  }
  config.animated = true;
  if (prefersReducedMotion) {
    config.target.textContent = formatCountValue(config.value, config);
    return;
  }
  const startValue = 0;
  const targetValue = config.value;
  const duration = Math.max(300, config.duration);
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * eased;
    config.target.textContent = formatCountValue(progress < 1 ? currentValue : targetValue, config);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function collectCountTargets() {
  countObserver?.disconnect();
  countObserver = null;
  countTargetMap.clear();
  document.querySelectorAll('[data-count]').forEach((el) => {
    const targetValue = Number(el.dataset.count);
    if (!Number.isFinite(targetValue)) {
      return;
    }
    const selector = el.dataset.countSelector || 'strong';
    const target = selector === 'self' ? el : el.querySelector(selector) || el.querySelector('strong') || el;
    if (!target) {
      return;
    }
    const config = {
      element: el,
      target,
      value: targetValue,
      prefix: el.dataset.countPrefix || '',
      suffix: el.dataset.countSuffix || '',
      decimals: Number(el.dataset.countDecimals || '0'),
      duration: Number(el.dataset.countDuration || '1200'),
      animated: false,
    };
    target.textContent = formatCountValue(0, config);
    countTargetMap.set(el, config);
  });

  if (!countTargetMap.size) {
    return;
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    countTargetMap.forEach((config) => {
      config.target.textContent = formatCountValue(config.value, config);
    });
    return;
  }

  countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const config = countTargetMap.get(entry.target);
        if (config) {
          animateCount(config);
          countObserver?.unobserve(entry.target);
        }
      }
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });

  countTargetMap.forEach((config, el) => {
    countObserver?.observe(el);
  });
}

function updateStickyCtaState() {
  if (!stickyCta) return;
  const visible = stickyCtaShouldShow && !stickyCtaManualHidden;
  stickyCta.classList.toggle('is-visible', visible);
  stickyCta.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function initStickyCtaVisibility() {
  if (!stickyCta) return;
  stickyCta.setAttribute('aria-hidden', 'true');
  if (!('IntersectionObserver' in window)) {
    stickyCtaShouldShow = true;
    updateStickyCtaState();
    return;
  }
  const heroSection = document.getElementById('hero');
  const footer = document.querySelector('footer');

  if (heroSection) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroSection) {
          stickyCtaHeroInView = entry.isIntersecting;
        }
      });
      stickyCtaShouldShow = !stickyCtaHeroInView && !stickyCtaFooterInView;
      updateStickyCtaState();
    }, { threshold: 0.2 });
    heroObserver.observe(heroSection);
  } else {
    stickyCtaHeroInView = false;
    stickyCtaShouldShow = !stickyCtaFooterInView;
    updateStickyCtaState();
  }

  if (footer) {
    const footerObserver = new IntersectionObserver((entries) => {
      stickyCtaFooterInView = entries.some((entry) => entry.isIntersecting);
      stickyCtaShouldShow = !stickyCtaHeroInView && !stickyCtaFooterInView;
      updateStickyCtaState();
    }, { threshold: 0.05 });
    footerObserver.observe(footer);
  }
}

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
    stickyCtaManualHidden = true;
    updateStickyCtaState();
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
    stickyCtaManualHidden = false;
    updateStickyCtaState();
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

function revealElement(el) {
  el.classList.add('reveal--in');
}

function revealAllElements() {
  revealTargets.forEach((el) => {
    revealElement(el);
  });
}

function setupRevealObserver() {
  if (!revealTargets.length) {
    return;
  }
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealAllElements();
    return;
  }
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        revealElement(entry.target);
        revealObserver?.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  revealTargets.forEach((el) => {
    if (!el.classList.contains('reveal--in')) {
      revealObserver.observe(el);
    }
  });
}

function handleReducedMotionChange(event) {
  prefersReducedMotion = event.matches;
  if (prefersReducedMotion) {
    revealObserver?.disconnect();
    revealAllElements();
  } else {
    setupRevealObserver();
  }
  collectCountTargets();
}

const initialRevealElements = document.querySelectorAll('.reveal');
if (initialRevealElements.length) {
  revealTargets.push(...initialRevealElements);
  setupRevealObserver();
}

prefersReducedMotionMedia.addEventListener('change', handleReducedMotionChange);

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
      const response = await fetch(form.getAttribute('action') || endpoints.contact, {
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
  const availableFilters = new Set(filterButtons.map((button) => button.dataset.filter));
  availableFilters.add('alle');
  let activeFilter = 'alle';

  function normaliseFilter(filter) {
    if (filter && availableFilters.has(filter)) {
      return filter;
    }
    return 'alle';
  }

  function applyFilter(filter) {
    const nextFilter = normaliseFilter(filter);
    activeFilter = nextFilter;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === nextFilter;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    caseItems.forEach((item) => {
      const tags = (item.dataset.tags || '').split(' ').map((tag) => tag.trim()).filter(Boolean);
      const matches = nextFilter === 'alle' || tags.includes(nextFilter);
      item.hidden = !matches;
    });
  }

  function updateFilter(filter, { updateHistory = true, method = 'push' } = {}) {
    const nextFilter = normaliseFilter(filter);
    applyFilter(nextFilter);
    const newHash = `#filter=${encodeURIComponent(nextFilter)}`;
    if (updateHistory && window.location.hash !== newHash) {
      const historyMethod = method === 'replace' ? 'replaceState' : 'pushState';
      if (typeof history[historyMethod] === 'function') {
        history[historyMethod](null, '', newHash);
      } else {
        window.location.hash = newHash;
      }
    }
  }

  function parseFilterFromHash(hash) {
    if (!hash) return null;
    const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!trimmed) return null;
    if (trimmed.startsWith('case-')) {
      return null;
    }
    const filterMatch = trimmed.match(/^filter=([^&]+)/i);
    if (filterMatch) {
      return decodeURIComponent(filterMatch[1]);
    }
    return trimmed;
  }

  function focusCaseById(caseId, { scroll = true } = {}) {
    const caseElement = document.getElementById(caseId);
    if (!caseElement) return;
    const tags = (caseElement.dataset.tags || '').split(' ').map((tag) => tag.trim()).filter(Boolean);
    const preferredFilter = tags.length ? normaliseFilter(tags[0]) : 'alle';
    applyFilter(preferredFilter);
    const previousTabIndex = caseElement.getAttribute('tabindex');
    caseElement.setAttribute('tabindex', '-1');
    if (scroll) {
      const behavior = prefersReducedMotion ? 'auto' : 'smooth';
      caseElement.scrollIntoView({ behavior, block: 'center' });
    }
    if (typeof caseElement.focus === 'function') {
      try {
        caseElement.focus({ preventScroll: true });
      } catch (error) {
        caseElement.focus();
      }
    }
    const restoreTabIndex = () => {
      if (previousTabIndex === null) {
        caseElement.removeAttribute('tabindex');
      } else {
        caseElement.setAttribute('tabindex', previousTabIndex);
      }
    };
    caseElement.addEventListener('blur', restoreTabIndex, { once: true });
  }

  function handleLocationUpdate({ focusCase = false } = {}) {
    const { hash } = window.location;
    if (hash && hash.startsWith('#case-')) {
      focusCaseById(hash.slice(1), { scroll: focusCase });
      return;
    }
    const parsedFilter = parseFilterFromHash(hash);
    const nextFilter = parsedFilter ? normaliseFilter(parsedFilter) : 'alle';
    updateFilter(nextFilter, { updateHistory: false, method: 'replace' });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'alle';
      updateFilter(filter, { method: 'push' });
    });
  });

  handleLocationUpdate({ focusCase: true });
  window.addEventListener('hashchange', () => handleLocationUpdate({ focusCase: true }));
  window.addEventListener('popstate', () => handleLocationUpdate({ focusCase: true }));
}

logEvent('page_loaded', { page: document.documentElement.dataset.page });
