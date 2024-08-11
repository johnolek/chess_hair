class AdminsController < ApplicationController
  before_action :authenticate_user!
  before_action :verify_admin!

  def user_summary
    @users = User.all.includes([:user_puzzles])
    render 'user_summary'
  end

  private

  def verify_admin!
    redirect_to root_path, alert: 'Access denied.' unless current_user&.admin?
  end
end
