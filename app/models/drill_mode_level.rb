class DrillModeLevel < ApplicationRecord
  belongs_to :user, dependent: :destroy

  validates :theme, presence: true, uniqueness: { scope: :user_id }

  def as_json(options = nil)
    super(options).slice('theme', 'rating', 'updated_at')
  end
end
