class RemoveSkippedFromPuzzleResult < ActiveRecord::Migration[7.1]
  def change
    remove_column :puzzle_results, :skipped
  end
end
