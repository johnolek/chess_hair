class AddThemesAndOpeningTagsToLichessPuzzles < ActiveRecord::Migration[7.1]
  def change
    add_column :lichess_puzzles, :themes, :string
    add_column :lichess_puzzles, :opening_tags, :string
  end
end
