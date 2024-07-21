class PuzzleResult < ApplicationRecord
  belongs_to :user

  scope :correct, -> { where(made_mistake: false)}

  def correct?
    !made_mistake
  end
end
