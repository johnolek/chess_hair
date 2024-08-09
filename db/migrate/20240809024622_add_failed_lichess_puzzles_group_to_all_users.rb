class AddFailedLichessPuzzlesGroupToAllUsers < ActiveRecord::Migration[7.1]
  def change
    User.all.each do |user|
      user.collections.create!(name: 'failed_lichess_puzzles')
    end
  end
end
