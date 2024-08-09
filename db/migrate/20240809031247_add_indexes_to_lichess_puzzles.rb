class AddIndexesToLichessPuzzles < ActiveRecord::Migration[7.1]
  def change
    add_index :lichess_puzzles, :fen, length: 20
    add_index :lichess_puzzles, :rating
    add_index :lichess_puzzles, :popularity
    add_index :lichess_puzzles, :nb_plays
    add_index :lichess_puzzles, :themes
    add_index :lichess_puzzles, :opening_tags
  end
end
