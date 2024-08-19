class DrillModeLevel < ApplicationRecord
  belongs_to :user

  validates :theme, presence: true, uniqueness: { scope: :user_id }

  def as_json(options = nil)
    super(options).slice('theme', 'rating')
  end
end
