class AddLichessCodeToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :lichess_code, :string
    add_column :users, :lichess_code_verifier, :string
  end
end
