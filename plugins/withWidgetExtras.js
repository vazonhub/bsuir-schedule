/**
 * Expo config plugin that patches Android widget XML configs after
 * react-native-android-widget generates them.
 *
 * Adds:
 * - android:initialLayout="@layout/widget_loading" (instead of rn_widget)
 * - android:previewLayout="@layout/widget_preview_*" (API 31+)
 *
 * Also copies the loading and preview layout files into the Android res.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGETS = [
  { name: 'schedulesmall', previewLayout: 'widget_preview_small' },
  { name: 'schedulemedium', previewLayout: 'widget_preview_medium' },
  { name: 'schedulelarge', previewLayout: 'widget_preview_large' },
];

function withWidgetExtras(config) {
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const resDir = path.join(
        c.modRequest.platformProjectRoot,
        'app/src/main/res',
      );

      // Ensure layout directory exists
      const layoutDir = path.join(resDir, 'layout');
      fs.mkdirSync(layoutDir, { recursive: true });

      // Copy layout files from android/app/src/main/res/layout/
      // (they are kept in-tree and committed; this just ensures they land
      // in the prebuild output even if the layout/ folder was cleaned).
      const srcLayoutDir = path.join(
        projectRoot,
        'android/app/src/main/res/layout',
      );
      if (fs.existsSync(srcLayoutDir)) {
        for (const file of fs.readdirSync(srcLayoutDir)) {
          if (file.endsWith('.xml')) {
            fs.copyFileSync(
              path.join(srcLayoutDir, file),
              path.join(layoutDir, file),
            );
          }
        }
      }

      // Patch each widget XML
      const xmlDir = path.join(resDir, 'xml');
      for (const widget of WIDGETS) {
        const xmlPath = path.join(
          xmlDir,
          `widgetprovider_${widget.name}.xml`,
        );
        if (!fs.existsSync(xmlPath)) continue;

        let xml = fs.readFileSync(xmlPath, 'utf8');

        // Replace initialLayout
        xml = xml.replace(
          'android:initialLayout="@layout/rn_widget"',
          'android:initialLayout="@layout/widget_loading"',
        );

        // Add previewLayout if not present (insert before updatePeriodMillis)
        if (
          !xml.includes('android:previewLayout') &&
          widget.previewLayout
        ) {
          xml = xml.replace(
            'android:updatePeriodMillis',
            `android:previewLayout="@layout/${widget.previewLayout}"\n    android:updatePeriodMillis`,
          );
        }

        fs.writeFileSync(xmlPath, xml);
      }

      return c;
    },
  ]);
}

module.exports = withWidgetExtras;
