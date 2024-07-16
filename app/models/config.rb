class Config < ApplicationRecord
  belongs_to :user

  validate :user_can_have_only_one_config

  def set_setting(key, value)
    current_settings = settings || {}
    current_settings[key] = value
    self.settings = current_settings
    save!
  end

  def get_setting(key, default=nil)
    settings.fetch(key, default)
  end

  def self.default_settings
    {
      "puzzles.batchSize" => 15,
      "puzzles.timeGoal" => 15,
    }
  end

  def settings
    Config.default_settings.merge(super)
  end

  private

  def user_can_have_only_one_config
    if new_record? && Config.exists?(user_id: user_id)
      errors.add(:user_id, "can only have one config object")
    end
  end
end
