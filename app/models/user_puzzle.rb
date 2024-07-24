class UserPuzzle < ApplicationRecord
  belongs_to :user
  has_one :lichess_puzzle, primary_key: :lichess_puzzle_id, foreign_key: :puzzle_id
end
