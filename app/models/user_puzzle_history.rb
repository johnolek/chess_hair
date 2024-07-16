class UserPuzzleHistory < ApplicationRecord
  belongs_to :user

  scope :for_puzzle_id, ->(puzzle_id) { where(puzzle_id: puzzle_id) if puzzle_id.present? }

  scope :minimum_rating, ->(rating) { where('rating >= ?', rating) }
  scope :maximum_rating, ->(rating) { where('rating <= ?', rating) }

  scope :solved_correctly, -> { where(win: true) }
  scope :solved_incorrectly, -> { where(win: false) }
  scope :with_theme, ->(theme) { where('themes LIKE ?', "%#{theme}%") }
  scope :without_theme, ->(theme) { where.not('themes LIKE ?', "%#{theme}%") }
end
