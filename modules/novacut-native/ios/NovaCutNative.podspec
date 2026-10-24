Pod::Spec.new do |s|
  s.name           = 'NovaCutNative'
  s.version        = '1.0.0'
  s.summary        = 'NovaCut High Performance iOS Video Editor Native Module'
  s.description    = 'Native AVFoundation and VideoToolbox hardware acceleration bridge for NovaCut.'
  s.author         = 'NovaCut Team'
  s.homepage       = 'https://github.com/novacut'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
