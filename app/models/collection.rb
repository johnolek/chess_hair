# app/models/collection.rb
class Collection < ApplicationRecord
  belongs_to :user
  has_and_belongs_to_many :user_puzzles

  validates :name, presence: true, uniqueness: { scope: :user_id }

  def add_puzzle(puzzle)
    user_puzzles << puzzle
    save!
  end

  def remove_puzzle(puzzle)
    user_puzzles.delete(puzzle)
    save!
  end
end
