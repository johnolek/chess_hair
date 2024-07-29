class AddLastPlayedToUserPuzzle < ActiveRecord::Migration[7.1]
  def change
    add_column :user_puzzles, :last_played, :datetime
    add_index :user_puzzles, :last_played
  end
end
