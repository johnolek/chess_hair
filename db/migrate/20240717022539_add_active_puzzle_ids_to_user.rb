class AddActivePuzzleIdsToUser < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :active_puzzle_ids, :text
  end
end
