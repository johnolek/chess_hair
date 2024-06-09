class ApplicationController < ActionController::Base
  def knight_moves
  end

  def daily_games
    @username = params[:username].gsub(/[^a-zA-Z0-9_-]/, '')
    @body_attributes = {
      'chess-dot-com-username': @username
    }
  end

  private

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
