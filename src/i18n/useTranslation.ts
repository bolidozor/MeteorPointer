import { translations } from './translations';
import { useSettings } from '@features/settings/useSettings';

export function useTranslation() {
  const language = useSettings((state) => state.language);
  return translations[language];
}
