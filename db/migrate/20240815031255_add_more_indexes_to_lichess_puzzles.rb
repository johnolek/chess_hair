class AddMoreIndexesToLichessPuzzles < ActiveRecord::Migration[7.1]
  def change
    add_index :lichess_puzzles, :rating_deviation
    add_index :lichess_puzzles, :moves
  end
end
