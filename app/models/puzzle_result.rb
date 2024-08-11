class PuzzleResult < ApplicationRecord
  belongs_to :user
  belongs_to :user_puzzle, optional: true

  after_create :recalculate_user_puzzle_stats

  scope :correct, -> { where(made_mistake: false)}
  scope :incorrect, -> { where(made_mistake: true)}

  def correct?
    !made_mistake
  end

  def recalculate_user_puzzle_stats
    if user_puzzle
      user_puzzle.recalculate_stats
    end
  end
end
