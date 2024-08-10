class RenamePuzzleResultsPuzzleIdToLichessPuzzleId < ActiveRecord::Migration[7.1]
  def change
    rename_column :puzzle_results, :puzzle_id, :lichess_puzzle_id
  end
end
