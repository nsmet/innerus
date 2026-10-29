import type { Language } from './types';

/**
 * The only public addresses InnerUs knows (D49). They are opened by an explicit tap, in the system browser or
 * mail app; the app itself never loads them and never depends on them for content or personal data (spec 528).
 * The pages are `store/web/privacy.html` and `store/web/support.html`, hosted on innerus.app.
 * The same URLs go into App Store Connect (Privacy Policy URL, Support URL).
 */
export const SUPPORT_EMAIL = 'info@innerus.app';
export const PRIVACY_URL = 'https://innerus.app/privacy.html';
export const SUPPORT_URL = 'https://innerus.app/support.html';

/** The pages are bilingual; `#nl` jumps to the Dutch half. */
export function pageUrl(url: string, language: Language) {
  return language === 'nl' ? `${url}#nl` : url;
}

/** A deliberate email to support. Only the app version goes along; never personal content (spec 379). */
export function supportMailUrl(version: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`InnerUs ${version}`)}`;
}
