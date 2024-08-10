namespace :site do
  desc "Update site version"
  task :update_site_version => :environment do
    latest_commit = `git rev-parse HEAD`.strip
    SiteSetting.update_setting('version', latest_commit)
  end
end
