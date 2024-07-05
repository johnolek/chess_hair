class CreateLichessTables < ActiveRecord::Migration[7.1]
  def change
    create_table :lichess_puzzles do |t|
      t.string :puzzle_id
      t.string :fen
      t.text :moves
      t.text :game_url
      t.integer :rating
      t.integer :rating_deviation
      t.integer :popularity
      t.integer :nb_plays
    end
    add_index :lichess_puzzles, :puzzle_id, unique: true

    create_table :tags do |t|
      t.string :name
    end
    add_index :tags, :name, unique: true

    create_table :opening_tags do |t|
      t.string :name
    end
    add_index :opening_tags, :name, unique: true

    create_table :lichess_puzzle_tags do |t|
      t.references :lichess_puzzle, null: false, foreign_key: true
      t.references :tag , null: false, foreign_key: true
    end

    create_table :lichess_puzzle_opening_tags do |t|
      t.references :lichess_puzzle, null: false, foreign_key: true
      t.references :opening_tag , null: false, foreign_key: true
    end
  end
end
