import type { ImageSourcePropType } from 'react-native';

export interface AppIconVariant {
  /** Key used for setAlternateIconName — null means primary/default. */
  key: string | null;
  label: string;
  /** Require the preview image. */
  preview: ImageSourcePropType;
}

/** All available app icon variants grouped by category. */
export const APP_ICON_SECTIONS: { titleKey: string; icons: AppIconVariant[] }[] = [
  {
    titleKey: 'settings.iconSectionClassic',
    icons: [
      { key: null, label: 'Default', preview: require('../../assets/icons/icon-bg-default.png') },
      { key: 'icon-bg-dark', label: 'Dark', preview: require('../../assets/icons/icon-bg-dark.png') },
      { key: 'icon-bg-blue', label: 'Blue', preview: require('../../assets/icons/icon-bg-blue.png') },
      { key: 'icon-bg-purple', label: 'Purple', preview: require('../../assets/icons/icon-bg-purple.png') },
      { key: 'icon-bg-red', label: 'Red', preview: require('../../assets/icons/icon-bg-red.png') },
      { key: 'icon-bg-orange', label: 'Orange', preview: require('../../assets/icons/icon-bg-orange.png') },
      { key: 'icon-bg-green', label: 'Green', preview: require('../../assets/icons/icon-bg-green.png') },
      { key: 'icon-bg-pink', label: 'Pink', preview: require('../../assets/icons/icon-bg-pink.png') },
      { key: 'icon-bg-teal', label: 'Teal', preview: require('../../assets/icons/icon-bg-teal.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionLight',
    icons: [
      { key: 'icon-light-classic-blue', label: 'Classic', preview: require('../../assets/icons/icon-light-classic-blue.png') },
      { key: 'icon-light-black', label: 'Black', preview: require('../../assets/icons/icon-light-black.png') },
      { key: 'icon-light-blue', label: 'Blue', preview: require('../../assets/icons/icon-light-blue.png') },
      { key: 'icon-light-purple', label: 'Purple', preview: require('../../assets/icons/icon-light-purple.png') },
      { key: 'icon-light-red', label: 'Red', preview: require('../../assets/icons/icon-light-red.png') },
      { key: 'icon-light-green', label: 'Green', preview: require('../../assets/icons/icon-light-green.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionDark',
    icons: [
      { key: 'icon-dark-blue', label: 'Blue', preview: require('../../assets/icons/icon-dark-blue.png') },
      { key: 'icon-dark-green', label: 'Green', preview: require('../../assets/icons/icon-dark-green.png') },
      { key: 'icon-dark-red', label: 'Red', preview: require('../../assets/icons/icon-dark-red.png') },
      { key: 'icon-dark-orange', label: 'Orange', preview: require('../../assets/icons/icon-dark-orange.png') },
      { key: 'icon-dark-purple', label: 'Purple', preview: require('../../assets/icons/icon-dark-purple.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionGradient',
    icons: [
      { key: 'icon-grad-blue-purple', label: 'Blue-Purple', preview: require('../../assets/icons/icon-grad-blue-purple.png') },
      { key: 'icon-grad-red-orange', label: 'Red-Orange', preview: require('../../assets/icons/icon-grad-red-orange.png') },
      { key: 'icon-grad-green-teal', label: 'Green-Teal', preview: require('../../assets/icons/icon-grad-green-teal.png') },
      { key: 'icon-grad-pink-purple', label: 'Pink-Purple', preview: require('../../assets/icons/icon-grad-pink-purple.png') },
      { key: 'icon-grad-midnight', label: 'Midnight', preview: require('../../assets/icons/icon-grad-midnight.png') },
    ],
  },
];
