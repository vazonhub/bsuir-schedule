/**
 * Easter egg: legendary lecturers who stay in the list forever,
 * even if they are removed from the BSUIR API.
 */
import type { EmployeeDto } from '@models/dto';

// The photo is bundled in assets in case it gets deleted from the server.
const onoshkoPhoto = require('../../assets/onoshko.jpg') as number;

/** Resolve bundled asset to a URI string usable by expo-image. */
const resolveAsset = (asset: number): string => {
  // expo-image and RN Image accept the require() result directly,
  // but our Avatar expects a string URI. Image.resolveAssetSource
  // converts the require() number into { uri: '...' }.

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
    calendarId: '',
    academicDepartment: ['Каф.ИСиТ', 'Каф.ПОИТ'],
    urlId: 'd-onoshko',
    fio: 'Оношко Д. Е.',
  },
];
