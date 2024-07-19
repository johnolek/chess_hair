class DeleteCurrentUserPuzzles < ActiveRecord::Migration[7.1]
  def up
    UserPuzzle.destroy_all
  end
end
