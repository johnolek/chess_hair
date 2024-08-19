class DrillModeLevel < ApplicationRecord
  belongs_to :user

  validates :theme, presence: true, uniqueness: { scope: :user_id }
end
