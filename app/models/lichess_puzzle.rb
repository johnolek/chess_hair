class LichessPuzzle < ApplicationRecord
  validates :puzzle_id, presence: true, uniqueness: true

  scope :high_quality, -> { where(rating_deviation: ..80, popularity: 80.., nb_plays: 1000..) }

  scope :rating_range, ->(min, max) { where(rating: min..max) }
  scope :with_theme, ->(theme) { where(arel_table[:themes].matches("%#{theme}%")) }
  scope :with_any_of_these_themes, ->(themes) { where(arel_table[:themes].matches_any(themes.map { |theme| "%#{theme}%" })) }
  scope :without_theme, ->(theme) { where.not(arel_table[:themes].matches("%#{theme}%")) }

  scope :excluding_user_puzzles, ->(user) do
    return all if user.user_puzzles.empty?
    where.not(puzzle_id: user.user_puzzles.select(:lichess_puzzle_id))
  end

  THEMES = %w[advancedPawn advantage anastasiaMate arabianMate attackingF2F7 attraction backRankMate bishopEndgame bodenMate capturingDefender castling clearance crushing defensiveMove deflection discoveredAttack doubleBishopMate doubleCheck dovetailMate enPassant endgame equality exposedKing fork hangingPiece hookMate interference intermezzo kingsideAttack knightEndgame long master masterVsMaster mate mateIn1 mateIn2 mateIn3 mateIn4 mateIn5 middlegame oneMove opening pawnEndgame pin promotion queenEndgame queenRookEndgame queensideAttack quietMove rookEndgame sacrifice short skewer smotheredMate superGM trappedPiece underPromotion veryLong xRayAttack zugzwang]
end
