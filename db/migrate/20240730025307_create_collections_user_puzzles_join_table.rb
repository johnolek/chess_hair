class CreateCollectionsUserPuzzlesJoinTable < ActiveRecord::Migration[7.1]
  def change
    create_join_table :collections, :user_puzzles do |t|
      t.index :collection_id
      t.index :user_puzzle_id
    end
  end
end
