class CreateConfigs < ActiveRecord::Migration[7.1]
  def change
    create_table :configs do |t|
      t.references :user, foreign_key: true, null: false
      t.json :settings, null: false, default: {}
      t.timestamps
    end
  end
end
