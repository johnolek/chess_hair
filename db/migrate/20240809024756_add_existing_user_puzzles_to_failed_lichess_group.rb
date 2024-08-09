class AddExistingUserPuzzlesToFailedLichessGroup < ActiveRecord::Migration[7.1]
  def change
    User.all.each do |user|
      collection = user.failed_lichess_puzzles_collection
      user.user_puzzles.each do |puzzle|
        collection.user_puzzles << puzzle
        collection.save!
      end
    end
  end
end
