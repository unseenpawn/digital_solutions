const projectRoot = new URL('../..', import.meta.url);
const basePath = projectRoot.pathname.endsWith('/') ? projectRoot.pathname : `${projectRoot.pathname}/`;
const baseUrl = new URL(basePath, window.location.origin);
const derivedSiteBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');

if (typeof window !== 'undefined' && typeof window.__SITE_BASE__ === 'undefined' && derivedSiteBase) {
  window.__SITE_BASE__ = derivedSiteBase;
}

function isExternal(target) {
  return /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:') || target.startsWith('tel:');
}

export function buildPath(target = '') {
  if (!target || target === '.') {
    return basePath;
  }
  if (target.startsWith('#') || isExternal(target)) {
    return target;
  }
  const resolved = new URL(target, baseUrl);
  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  return path;
}

export const routes = {
  home: buildPath(''),
  services: buildPath('leistungen.html'),
  work: buildPath('referenzen.html'),
  about: buildPath('ueber-uns.html'),
  contact: buildPath('kontakt.html'),
  imprint: buildPath('impressum.html'),
  privacy: buildPath('datenschutz.html'),
  sitemap: buildPath('sitemap.xml'),
};

export const endpoints = {
  contact: buildPath('kontakt.php'),
};

export const assets = {
  logo: buildPath('assets/img/logo.svg'),
  stylesheet: buildPath('assets/css/main.css'),
  manifest: buildPath('manifest.webmanifest'),
  favicon: buildPath('favicon.svg'),
};

export default {
  basePath,
  routes,
  endpoints,
  assets,
  buildPath,
};
