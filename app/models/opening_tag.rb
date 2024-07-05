class OpeningTag < ApplicationRecord
  has_many :lichess_puzzle_opening_tags
  has_many :lichess_puzzles, through: :lichess_puzzle_opening_tags
end
