class AddNextReviewTimeToUserPuzzles < ActiveRecord::Migration[7.1]
  def change
    add_column :user_puzzles, :next_review, :datetime
    add_index :user_puzzles, :next_review
  end
end
