class ConvertPuzzleHistoriesToUserPuzzles < ActiveRecord::Migration[7.1]
  def up
    User.all.each do |user|
      user.user_puzzle_histories.solved_incorrectly.each do |puzzle_history|
        puzzle_history.convert_to_user_puzzle
      end
    end
  end
  def down
    UserPuzzle.delete_all
  end
end
