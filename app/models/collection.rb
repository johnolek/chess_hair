# app/models/collection.rb
class Collection < ApplicationRecord
  belongs_to :user
  has_and_belongs_to_many :user_puzzles

  validates :name, presence: true, uniqueness: { scope: :user_id }
end
