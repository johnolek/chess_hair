class SiteSetting < ApplicationRecord
  class << self
    def get(name, default = nil)
      setting = SiteSetting.find_by(name: name)
      setting&.value || default
    end

    def update_setting(name, value)
      setting = SiteSetting.find_or_initialize_by(name: name)
      setting.update!(value: value)
    end

    def get_cached_site_version
      Rails.cache.fetch('version') do
        SiteSetting.find_by(name: 'version')&.value
      end
    end
  end
end
