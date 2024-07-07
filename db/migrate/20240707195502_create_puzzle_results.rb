class CreatePuzzleResults < ActiveRecord::Migration[7.1]
  def change
    create_table :puzzle_results do |t|
      t.references :users, foreign_key: true, null: false
      t.string :puzzle_id, null: false
      t.datetime :seen_at, null: false
      t.boolean :skipped, null: false, default: false
      t.boolean :made_mistake, null: false, default: false
      t.datetime :done_at

      t.timestamps
    end
  end
end
