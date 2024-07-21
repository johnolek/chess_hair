class DropUnneededTables < ActiveRecord::Migration[7.1]
  def change
    drop_table :lichess_puzzle_opening_tags
    drop_table :lichess_puzzle_tags
    drop_table :tags
    drop_table :opening_tags
  end
end
