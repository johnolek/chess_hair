class PuzzleResult < ApplicationRecord
  belongs_to :user

  validates :puzzle_id, uniqueness: { scope: [:user_id, :seen_at]}
end
