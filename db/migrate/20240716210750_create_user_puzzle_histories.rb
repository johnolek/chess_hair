class CreateUserPuzzleHistories < ActiveRecord::Migration[7.1]
  def change
    create_table :user_puzzle_histories do |t|
      t.references :user, null: false, foreign_key: true
      t.string :puzzle_id, null: false
      t.bigint :played_at, null: false
      t.boolean :win, null: false
      t.integer :rating, null: false
      t.integer :plays, null: false
      t.text :solution, null: false
      t.text :fen, null: false
      t.string :last_move, null: false

      t.timestamps
    end
    add_index :user_puzzle_histories, [:user_id, :puzzle_id, :played_at], unique: true
  end
end
