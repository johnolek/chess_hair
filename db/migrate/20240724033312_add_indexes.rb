class AddIndexes < ActiveRecord::Migration[7.1]
  def change
    add_index :user_puzzle_histories, :puzzle_id
    add_index :user_puzzle_histories, [:user_id, :puzzle_id]
    add_index :user_puzzle_histories, :created_at
    add_index :puzzle_results, :made_mistake
    add_index :puzzle_results, [:user_id, :puzzle_id]
    add_index :puzzle_results, :created_at
  end
end
