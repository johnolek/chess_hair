class LichessPuzzle < ApplicationRecord
  validates :puzzle_id, presence: true, uniqueness: true
end
