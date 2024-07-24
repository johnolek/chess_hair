require 'rack-mini-profiler'

Rack::MiniProfilerRails.initialize!(Rails.application)

Rack::MiniProfiler.authorize_request do |request|
  current_user&.admin?
end
