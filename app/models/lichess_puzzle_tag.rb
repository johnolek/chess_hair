class LichessPuzzleTag < ApplicationRecord
  belongs_to :lichess_puzzle
  belongs_to :tag
end
