class CreateUserPuzzles < ActiveRecord::Migration[7.1]
  def change
    create_table :user_puzzles do |t|
      t.references :user, foreign_key: true, null: false
      t.string :puzzle_id, null: false
      t.timestamps
    end
  end
end
