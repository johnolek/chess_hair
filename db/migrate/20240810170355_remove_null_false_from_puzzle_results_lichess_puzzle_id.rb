class RemoveNullFalseFromPuzzleResultsLichessPuzzleId < ActiveRecord::Migration[7.1]
  def change
    change_column_null :puzzle_results, :lichess_puzzle_id, true
  end
end
