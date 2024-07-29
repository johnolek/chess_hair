class RecalculateUserPuzzles < ActiveRecord::Migration[7.1]
  def change
    UserPuzzle.all.each do |user_puzzle|
      user_puzzle.recalculate_stats
    end
  end
end
