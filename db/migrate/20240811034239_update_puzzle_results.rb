class UpdatePuzzleResults < ActiveRecord::Migration[7.1]
  def change
    remove_column :puzzle_results, :user_id, :bigint
    change_column_null :puzzle_results, :user_puzzle_id, false
    add_foreign_key :puzzle_results, :user_puzzles, column: :user_puzzle_id
  end
end
