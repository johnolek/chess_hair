class CreateFavoritesCollectionForExistingUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :favorites_collection_for_existing_users do |t|
      User.all.each do |user|
        user.create_default_collection
      end

      t.timestamps
    end
  end
end
