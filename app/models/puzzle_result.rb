class PuzzleResult < ApplicationRecord
  belongs_to :user

  after_commit :recalculate_user_puzzle_stats

  scope :correct, -> { where(made_mistake: false)}
  scope :incorrect, -> { where(made_mistake: true)}

  def correct?
    !made_mistake
  end

  def recalculate_user_puzzle_stats
    user.user_puzzles.find_by(lichess_puzzle_id: puzzle_id)&.recalculate_stats
  end
end
