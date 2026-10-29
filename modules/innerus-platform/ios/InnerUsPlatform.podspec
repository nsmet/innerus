Pod::Spec.new do |s|
  s.name           = 'InnerUsPlatform'
  s.version        = '0.1.0'
  s.summary        = 'InnerUs local platform adapters (protected storage, capability probes).'
  s.description    = 'Narrow native adapters for the InnerUs Expo app. No network access.'
  s.license        = 'UNLICENSED'
  s.author         = 'InnerUs'
  s.homepage       = 'https://example.invalid/innerus'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
