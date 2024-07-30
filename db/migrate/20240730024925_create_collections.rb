class CreateCollections < ActiveRecord::Migration[7.1]
  def change
    create_table :collections do |t|
      t.string "name", null: false
      t.integer "user_id", null: false
      t.index ["user_id"], name: "index_collections_on_user_id"
      t.timestamps
    end
  end
end
