class ApplicationController < ActionController::Base
  def knight_moves
  end

  def daily_games
    @username = params[:username].gsub(/[^a-zA-Z0-9_-]/, '')
  end

end
