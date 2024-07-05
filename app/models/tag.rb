class Tag < ApplicationRecord
  has_many :lichess_puzzle_tags
  has_many :lichess_puzzles, through: :lichess_puzzle_tags
end
