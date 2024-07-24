class UpdateUserPuzzles < ActiveRecord::Migration[7.1]
  def change
    change_table :user_puzzles do |t|
      t.remove :puzzle_id
      t.string :lichess_puzzle_id, null: true
      t.integer :lichess_rating, null: true
      t.string :fen, null: false
      t.string :uci_moves, null: false
      t.float :average_solve_time, null: true
      t.integer :solve_streak, null: false, default: 0
      t.integer :total_fails, null: false, default: 0
      t.integer :total_solves, null: false, default: 0
      t.boolean :complete, null: false, default: false
    end
  end
end
