import { SubcomponentType } from '../types';

export function translateSubcomponentType(type: SubcomponentType): string {
  const translations: Record<SubcomponentType, string> = {
    opening: 'Öffnung',
    sturz: 'Sturz',
    brüstung: 'Brüstung',
    leibung_left: 'Leibung Links',
    leibung_right: 'Leibung Rechts'
  };

  return translations[type] || type;
}
