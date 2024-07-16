class AddThemesToPuzzleHistories < ActiveRecord::Migration[7.1]
  def change
    add_column :user_puzzle_histories, :themes, :string, null: false
  end
end
