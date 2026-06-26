require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiquidGlassTabBar'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.homepage       = 'https://github.com/DB14823/UniVerse-App'
  s.platforms      = { ios: '15.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = 'ios/**/*.{swift}'
  s.swift_version  = '5.9'
end
