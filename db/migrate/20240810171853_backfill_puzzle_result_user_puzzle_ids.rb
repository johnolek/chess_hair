class BackfillPuzzleResultUserPuzzleIds < ActiveRecord::Migration[7.1]
  def change
    User.all.each do |user|
      user.puzzle_results.each do |result|
        user_puzzle = user.user_puzzles.find_by(lichess_puzzle_id: result.lichess_puzzle_id)
        result.update!(user_puzzle_id: user_puzzle.id) if user_puzzle
      end
    end
  end
end
