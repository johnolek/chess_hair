class PuzzleResult < ApplicationRecord
  HUMAN_FRIENDLY_DATE_FORMAT = '%b %-e, %Y, %-I:%M%P'

  belongs_to :user_puzzle
  has_one :user, through: :user_puzzle

  after_create :recalculate_user_puzzle_stats

  scope :correct, -> { where(made_mistake: false) }
  scope :incorrect, -> { where(made_mistake: true) }

  def correct?
    !made_mistake
  end

  def recalculate_user_puzzle_stats
    user_puzzle.recalculate_stats
  end

  def as_json(options = nil)
    super(options).merge({
                           'time_played_human' => created_at.strftime(HUMAN_FRIENDLY_DATE_FORMAT)
                         })
  end
end
