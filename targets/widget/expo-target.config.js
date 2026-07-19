/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'ScheduleWidget',
  displayName: 'Расписание БГУИР',
  bundleIdentifier: '.widget',
  deploymentTarget: '15.1',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': config.ios?.entitlements?.[
      'com.apple.security.application-groups'
    ] ?? ['group.by.vazon.bsuirschedule'],
  },
});
