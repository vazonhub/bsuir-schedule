/**
 * Пасхалка: преподаватели-легенды, которые навсегда остаются в списке,
 * даже если их удалят из API БГУИР.
 */
import type { EmployeeDto } from '@models/dto';

// Фото забандлено в assets на случай удаления с сервера.
const onoshkoPhoto = require('../../assets/onoshko.jpg') as number;

/** Resolve bundled asset to a URI string usable by expo-image. */
const resolveAsset = (asset: number): string => {
  // expo-image и RN Image принимают require()-результат напрямую,
  // но наш Avatar ожидает string URI. Image.resolveAssetSource
  // конвертирует require()-число в { uri: '...' }.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { uri } = require('react-native').Image.resolveAssetSource(asset) as { uri: string };
  return uri;
};

export const LEGEND_EMPLOYEES: EmployeeDto[] = [
  {
    id: 502115,
    firstName: 'Дмитрий',
    lastName: 'Оношко',
    middleName: 'Евгеньевич',
    degree: '',
    rank: null,
    photoLink: resolveAsset(onoshkoPhoto),
    calendarId: 's13nh3rbqjfrfmu5i5m2i908v8@group.calendar.google.com',
    academicDepartment: ['Каф.ИСиТ', 'Каф.ПОИТ'],
    urlId: 'd-onoshko',
    fio: 'Оношко Д. Е.',
  },
];
