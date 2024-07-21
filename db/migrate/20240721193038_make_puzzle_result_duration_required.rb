class MakePuzzleResultDurationRequired < ActiveRecord::Migration[7.1]
  def change
    change_column_null :puzzle_results, :duration, false
  end
end
