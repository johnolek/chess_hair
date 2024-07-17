class PuzzleResult < ApplicationRecord
  belongs_to :user

  validates :puzzle_id, uniqueness: { scope: [:user_id, :seen_at]}

  scope :correct, -> { where(skipped: false, made_mistake: false).where.not(done_at: nil) }

  def correct?
    !skipped && !made_mistake && done_at
  end
end
