class Config < ApplicationRecord
  belongs_to :user

  validate :user_can_have_only_one_config

  after_update :maybe_recalculate_user_puzzles

  def set_setting(key, value)
    current_settings = settings || {}
    current_settings[key] = value
    @settings_before = settings
    self.settings = current_settings
    save!
  end

  def get_setting(key, default=nil)
    settings.fetch(key, default)
  end

  def puzzle_batch_size
    self.get_setting('puzzles.batchSize')
  end

  def puzzle_time_goal
    self.get_setting('puzzles.timeGoal')
  end

  def puzzle_consecutive_solves
    self.get_setting('puzzles.consecutiveSolves')
  end

  def puzzle_max_rating
    self.get_setting('puzzles.maxRating')
  end

  def puzzle_min_rating
    self.get_setting('puzzles.minRating')
  end

  def self.default_settings
    {
      "puzzles.batchSize" => 15,
      "puzzles.timeGoal" => 15,
      "puzzles.consecutiveSolves" => 2,
      "puzzles.oddsOfRandomCompleted" => 0.1,
      "puzzles.minimumTimeBetween" => 5.minutes.to_i,
      "puzzles.minRating" => 1,
      "puzzles.maxRating" => 3500,
    }
  end

  def settings
    Config.default_settings.merge(super)
  end

  def completion_criteria_changed?
    return false unless @settings_before
    return true if @settings_before['puzzles.timeGoal'] != settings['puzzles.timeGoal']
    return true if @settings_before['puzzles.consecutiveSolves'] != settings['puzzles.consecutiveSolves']

    false
  end

  def maybe_recalculate_user_puzzles
    if completion_criteria_changed?
      user.user_puzzles.each do |puzzle|
        puzzle.complete = puzzle.complete?
        puzzle.save!
      end
    end
  end

  private

  def user_can_have_only_one_config
    if new_record? && Config.exists?(user_id: user_id)
      errors.add(:user_id, "can only have one config object")
    end
  end
end
