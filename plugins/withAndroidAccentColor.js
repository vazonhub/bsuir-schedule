const { withAndroidStyles } = require('expo/config-plugins');

/**
 * Adds `colorAccent` to the Android AppTheme.
 * This controls the accent color for system dialogs (DatePicker, TimePicker, etc.).
 */
function withAndroidAccentColor(config, accentColor) {
  return withAndroidStyles(config, (mod) => {
    const styles = mod.modResults;
    const appTheme = styles.resources.style.find(
      (s) => s.$.name === 'AppTheme',
    );
    if (!appTheme) return mod;

    // Remove existing colorAccent if present
    appTheme.item = (appTheme.item ?? []).filter(
      (item) => item.$.name !== 'colorAccent',
    );

    // Add the new colorAccent
    appTheme.item.push({
      $: { name: 'colorAccent' },
      _: accentColor,
    });

    return mod;
  });
}

module.exports = withAndroidAccentColor;
