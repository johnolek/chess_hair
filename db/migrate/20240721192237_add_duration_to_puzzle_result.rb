class AddDurationToPuzzleResult < ActiveRecord::Migration[7.1]
  def change
    add_column :puzzle_results, :duration, :integer
  end
end
