class AddUserPuzzleIdToPuzzleResults < ActiveRecord::Migration[7.1]
  def change
    add_column :puzzle_results, :user_puzzle_id, :bigint
  end
end
