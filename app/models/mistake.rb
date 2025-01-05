class Mistake < ApplicationRecord
  belongs_to :user_puzzle, dependent: :destroy
end
