class ApplicationController < ActionController::Base
  before_action :set_default_body_attributes

  def knight_moves
  end

  def daily_games
    username_regex = /[^a-zA-Z0-9_-]/
    @chess_com_username = params[:chess_com_username].gsub(username_regex, '') if params[:chess_com_username]
    @lichess_username = params[:lichess_username].gsub(username_regex, '') if params[:lichess_username]
    @body_attributes['chess-dot-com-username'] = @chess_com_username unless @chess_com_username.blank?
    @body_attributes['lichess-username'] = @lichess_username unless @lichess_username.blank?
    @has_username = (@chess_com_username.present? || @lichess_username.present?)
  end

  private

  def set_default_body_attributes
    @body_attributes = {
      board: 'brown'
    }
  end

  def directory_names(path)
    Dir.glob(path).select do |path|
      File.directory?(path)
    end.map do |dir|
      File.basename(dir)
    end.uniq
  end

  def board_options
    data_board_values = Set.new
    File.open(Rails.root.join('public', 'css', 'lichess_site.css'), 'r') do |f|
      f.each_line do |line|
        match = line.match(/data-board=(\w+)\]/)
        data_board_values.add(match[1]) if match
      end
    end
    data_board_values
  end

end
