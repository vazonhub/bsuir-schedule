import type { ImageSourcePropType } from 'react-native';

export interface AppIconVariant {
  /** Key used for setAlternateAppIcon — null means primary/default. */
  key: string | null;
  label: string;
  preview: ImageSourcePropType;
}

/** All available app icon variants grouped by category. */
export const APP_ICON_SECTIONS: { titleKey: string; icons: AppIconVariant[] }[] = [
  {
    titleKey: 'settings.iconSectionClassic',
    icons: [
      { key: null, label: 'Default', preview: require('../../assets/icons/icon-bg-default.png') },
      { key: 'IconBgDark', label: 'Dark', preview: require('../../assets/icons/icon-bg-dark.png') },
      { key: 'IconBgBlue', label: 'Blue', preview: require('../../assets/icons/icon-bg-blue.png') },
      { key: 'IconBgPurple', label: 'Purple', preview: require('../../assets/icons/icon-bg-purple.png') },
      { key: 'IconBgRed', label: 'Red', preview: require('../../assets/icons/icon-bg-red.png') },
      { key: 'IconBgOrange', label: 'Orange', preview: require('../../assets/icons/icon-bg-orange.png') },
      { key: 'IconBgGreen', label: 'Green', preview: require('../../assets/icons/icon-bg-green.png') },
      { key: 'IconBgPink', label: 'Pink', preview: require('../../assets/icons/icon-bg-pink.png') },
      { key: 'IconBgTeal', label: 'Teal', preview: require('../../assets/icons/icon-bg-teal.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionLight',
    icons: [
      { key: 'IconLightClassicBlue', label: 'Classic', preview: require('../../assets/icons/icon-light-classic-blue.png') },
      { key: 'IconLightBlack', label: 'Black', preview: require('../../assets/icons/icon-light-black.png') },
      { key: 'IconLightBlue', label: 'Blue', preview: require('../../assets/icons/icon-light-blue.png') },
      { key: 'IconLightPurple', label: 'Purple', preview: require('../../assets/icons/icon-light-purple.png') },
      { key: 'IconLightRed', label: 'Red', preview: require('../../assets/icons/icon-light-red.png') },
      { key: 'IconLightGreen', label: 'Green', preview: require('../../assets/icons/icon-light-green.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionDark',
    icons: [
      { key: 'IconDarkBlue', label: 'Blue', preview: require('../../assets/icons/icon-dark-blue.png') },
      { key: 'IconDarkGreen', label: 'Green', preview: require('../../assets/icons/icon-dark-green.png') },
      { key: 'IconDarkRed', label: 'Red', preview: require('../../assets/icons/icon-dark-red.png') },
      { key: 'IconDarkOrange', label: 'Orange', preview: require('../../assets/icons/icon-dark-orange.png') },
      { key: 'IconDarkPurple', label: 'Purple', preview: require('../../assets/icons/icon-dark-purple.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionGradient',
    icons: [
      { key: 'IconGradBluePurple', label: 'Blue-Purple', preview: require('../../assets/icons/icon-grad-blue-purple.png') },
      { key: 'IconGradRedOrange', label: 'Red-Orange', preview: require('../../assets/icons/icon-grad-red-orange.png') },
      { key: 'IconGradGreenTeal', label: 'Green-Teal', preview: require('../../assets/icons/icon-grad-green-teal.png') },
      { key: 'IconGradPinkPurple', label: 'Pink-Purple', preview: require('../../assets/icons/icon-grad-pink-purple.png') },
      { key: 'IconGradMidnight', label: 'Midnight', preview: require('../../assets/icons/icon-grad-midnight.png') },
    ],
  },
];
