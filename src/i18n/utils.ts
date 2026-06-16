import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

// Slugs per locale for each route key
const routes = {
  home:    { es: '/',          en: '/'       },
  rugs:    { es: '/alfombras', en: '/rugs'   },
  about:   { es: '/sobre-mi',  en: '/about'  },
  contact: { es: '/contacto',  en: '/contact'},
} as const;

type RouteKey = keyof typeof routes;

export function getLocalizedPath(path: string, lang: string): string {
  const locale = lang as 'es' | 'en';
  const prefix = locale === defaultLang ? '' : `/${locale}`;
  const normalizedPath = path.replace(/\/$/, '') || '/';

  for (const key of Object.keys(routes) as RouteKey[]) {
    const entry = routes[key];
    if (normalizedPath === entry.es || normalizedPath === entry.en) {
      return `${prefix}${entry[locale]}`;
    }
  }

  return `${prefix}${normalizedPath}`;
}
