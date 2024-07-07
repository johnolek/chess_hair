class UserPuzzle < ApplicationRecord
  belongs_to :user

  validates :puzzle_id, uniqueness: { scope: :user_id }
end
