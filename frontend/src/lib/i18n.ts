import { getNavigatorLanguageJaOrBlank, useJaOr } from '$lib/svelteutils/i18n';

export { useJaOr } from '$lib/svelteutils/i18n';

export const DEFAULT_LANGUAGE = 'en';

export function i18nKit(lang?: string): {
  _: (ja: string, en: string) => string;
  isJa: boolean;
  lang: string;
} {
  const _lang = lang || getNavigatorLanguageJaOrBlank() || DEFAULT_LANGUAGE;
  const _ = useJaOr(_lang);
  return {
    _,
    isJa: _lang === 'ja',
    lang: _lang
  };
}
