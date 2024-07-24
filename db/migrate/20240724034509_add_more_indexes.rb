class AddMoreIndexes < ActiveRecord::Migration[7.1]
  def change
    add_index :user_puzzle_histories, :win
    add_index :user_puzzle_histories, :rating
    add_index :user_puzzle_histories, :themes
  end
end
