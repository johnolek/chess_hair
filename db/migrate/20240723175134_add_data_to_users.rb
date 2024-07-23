class AddDataToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :data, :json, default: {}
  end
end
