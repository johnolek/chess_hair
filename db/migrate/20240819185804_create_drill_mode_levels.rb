class CreateDrillModeLevels < ActiveRecord::Migration[7.1]
  def change
    create_table :drill_mode_levels do |t|
      t.references :user, foreign_key: true, null: false
      t.string :theme, null: false
      t.integer :rating
      t.timestamps
    end
  end
end
