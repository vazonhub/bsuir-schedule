Pod::Spec.new do |s|
  s.name           = 'AccessibilityInfo'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for extra iOS accessibility APIs'
  s.description    = 'Reads UIAccessibility.shouldDifferentiateWithoutColor on iOS'
  s.author         = 'vazon'
  s.homepage       = 'https://github.com/nicknameisthekey'
  s.license        = 'MIT'
  s.source         = { git: '' }
  s.platforms      = { ios: '15.1' }

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
  s.swift_version = '5.4'
end
