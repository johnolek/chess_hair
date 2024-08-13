class LichessPuzzle < ApplicationRecord
  validates :puzzle_id, presence: true, uniqueness: true

  scope :high_quality, -> { where(rating_deviation: ..80, popularity: 80.., nb_plays: 1000..) }

  scope :excluding_user_puzzles, ->(user) do
    return all if user.user_puzzles.empty?
    where.not(puzzle_id: user.user_puzzles.select(:lichess_puzzle_id))
  end
end
