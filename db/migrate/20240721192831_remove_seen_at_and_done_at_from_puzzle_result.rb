class RemoveSeenAtAndDoneAtFromPuzzleResult < ActiveRecord::Migration[7.1]
  def change
    remove_column :puzzle_results, :seen_at, :datetime
    remove_column :puzzle_results, :done_at, :datetime
  end
end
