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
      { key: null, label: 'Default', preview: require('../../assets/icons/IconBgDefault.png') },
      { key: 'IconBgDark', label: 'Dark', preview: require('../../assets/icons/IconBgDark.png') },
      { key: 'IconBgBlue', label: 'Blue', preview: require('../../assets/icons/IconBgBlue.png') },
      {
        key: 'IconBgPurple',
        label: 'Purple',
        preview: require('../../assets/icons/IconBgPurple.png'),
      },
      { key: 'IconBgRed', label: 'Red', preview: require('../../assets/icons/IconBgRed.png') },
      {
        key: 'IconBgOrange',
        label: 'Orange',
        preview: require('../../assets/icons/IconBgOrange.png'),
      },
      {
        key: 'IconBgGreen',
        label: 'Green',
        preview: require('../../assets/icons/IconBgGreen.png'),
      },
      { key: 'IconBgPink', label: 'Pink', preview: require('../../assets/icons/IconBgPink.png') },
      { key: 'IconBgTeal', label: 'Teal', preview: require('../../assets/icons/IconBgTeal.png') },
    ],
  },
  {
    titleKey: 'settings.iconSectionLight',
    icons: [
      {
        key: 'IconLightClassicBlue',
        label: 'Classic',
        preview: require('../../assets/icons/IconLightClassicBlue.png'),
      },
      {
        key: 'IconLightBlack',
        label: 'Black',
        preview: require('../../assets/icons/IconLightBlack.png'),
      },
      {
        key: 'IconLightBlue',
        label: 'Blue',
        preview: require('../../assets/icons/IconLightBlue.png'),
      },
      {
        key: 'IconLightPurple',
        label: 'Purple',
        preview: require('../../assets/icons/IconLightPurple.png'),
      },
      {
        key: 'IconLightRed',
        label: 'Red',
        preview: require('../../assets/icons/IconLightRed.png'),
      },
      {
        key: 'IconLightGreen',
        label: 'Green',
        preview: require('../../assets/icons/IconLightGreen.png'),
      },
    ],
  },
  {
    titleKey: 'settings.iconSectionDark',
    icons: [
      {
        key: 'IconDarkBlue',
        label: 'Blue',
        preview: require('../../assets/icons/IconDarkBlue.png'),
      },
      {
        key: 'IconDarkGreen',
        label: 'Green',
        preview: require('../../assets/icons/IconDarkGreen.png'),
      },
      { key: 'IconDarkRed', label: 'Red', preview: require('../../assets/icons/IconDarkRed.png') },
      {
        key: 'IconDarkOrange',
        label: 'Orange',
        preview: require('../../assets/icons/IconDarkOrange.png'),
      },
      {
        key: 'IconDarkPurple',
        label: 'Purple',
        preview: require('../../assets/icons/IconDarkPurple.png'),
      },
    ],
  },
  {
    titleKey: 'settings.iconSectionGradient',
    icons: [
      {
        key: 'IconGradBluePurple',
        label: 'Blue-Purple',
        preview: require('../../assets/icons/IconGradBluePurple.png'),
      },
      {
        key: 'IconGradRedOrange',
        label: 'Red-Orange',
        preview: require('../../assets/icons/IconGradRedOrange.png'),
      },
      {
        key: 'IconGradGreenTeal',
        label: 'Green-Teal',
        preview: require('../../assets/icons/IconGradGreenTeal.png'),
      },
      {
        key: 'IconGradPinkPurple',
        label: 'Pink-Purple',
        preview: require('../../assets/icons/IconGradPinkPurple.png'),
      },
      {
        key: 'IconGradMidnight',
        label: 'Midnight',
        preview: require('../../assets/icons/IconGradMidnight.png'),
      },
    ],
  },
];
