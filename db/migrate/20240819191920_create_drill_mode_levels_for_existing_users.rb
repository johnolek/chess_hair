class CreateDrillModeLevelsForExistingUsers < ActiveRecord::Migration[7.1]
  def change
    User.all.each do |user|
      user.create_default_drill_mode_levels
    end
  end
end
