class CreateSiteSettings < ActiveRecord::Migration[7.1]
  def change
    create_table :site_settings do |t|
      t.string :name, null: false
      t.json :value, null: false
      t.timestamps
    end
  end
end
