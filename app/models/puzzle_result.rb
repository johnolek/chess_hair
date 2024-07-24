class PuzzleResult < ApplicationRecord
  belongs_to :user

  scope :correct, -> { where(made_mistake: false)}
  scope :incorrect, -> { where(made_mistake: true)}

  def correct?
    !made_mistake
  end
end
