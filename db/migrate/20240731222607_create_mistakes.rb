class CreateMistakes < ActiveRecord::Migration[7.1]
  def change
    create_table :mistakes do |t|
      t.references :user_puzzle, null: false, foreign_key: true
      t.integer :move_index, null: false
      t.string :uci_move, null: false
      t.timestamps
    end
  end
end
