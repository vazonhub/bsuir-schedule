Pod::Spec.new do |s|
  s.name           = 'WatchBridge'
  s.version        = '1.0.0'
  s.summary        = 'Phone-side WatchConnectivity bridge for Bsuir Time.'
  s.description    = 'Pushes schedule snapshots to the paired Apple Watch via WCSession.'
  s.author         = ''
  s.homepage       = 'https://github.com/vazonhub/bsuir-schedule'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
