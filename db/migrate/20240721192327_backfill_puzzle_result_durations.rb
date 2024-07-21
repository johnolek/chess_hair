class BackfillPuzzleResultDurations < ActiveRecord::Migration[7.1]
  def change
    PuzzleResult.find_each do |puzzle_result|
      if puzzle_result.done_at
        puzzle_result.update!(duration: puzzle_result.done_at - puzzle_result.seen_at)
      end
    end
  end
end
