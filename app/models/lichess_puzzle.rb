class LichessPuzzle < ApplicationRecord
  self.primary_key = 'puzzle_id'

  has_many :lichess_puzzle_tags
  has_many :tags, through: :lichess_puzzle_tags

  has_many :lichess_puzzle_opening_tags
  has_many :opening_tags, through: :lichess_puzzle_opening_tags

  validates :puzzle_id, presence: true, uniqueness: true
end
