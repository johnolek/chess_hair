class AddLichessApiTokenToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :lichess_api_token, :string
  end
end
