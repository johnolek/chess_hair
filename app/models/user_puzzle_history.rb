class UserPuzzleHistory < ApplicationRecord
  belongs_to :user, dependent: :destroy

  scope :for_puzzle_id, ->(puzzle_id) { where(puzzle_id: puzzle_id) if puzzle_id.present? }

  scope :solved_correctly, -> { where(win: true) }
  scope :solved_incorrectly, -> { where(win: false) }
  scope :with_theme, ->(theme) { where('themes LIKE ?', "%#{theme}%") }
  scope :without_theme, ->(theme) { where.not('themes LIKE ?', "%#{theme}%") }

  has_one :lichess_puzzle, primary_key: :puzzle_id, foreign_key: :puzzle_id
  scope :with_lichess_puzzle, -> { joins(:lichess_puzzle) }

  def create_user_puzzle
    return unless lichess_puzzle.present? && lichess_puzzle.fen
    return if user.user_puzzles.exists?(fen: lichess_puzzle.fen)
    collection = user.failed_lichess_puzzles_collection
    new_puzzle = user.user_puzzles.create!(
      lichess_puzzle_id: puzzle_id,
      lichess_rating: lichess_puzzle.rating,
      uci_moves: lichess_puzzle.moves,
      fen: lichess_puzzle.fen,
    )
    collection.user_puzzles << new_puzzle
    collection.save!
  end
end
