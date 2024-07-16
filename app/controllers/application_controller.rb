class ApplicationController < ActionController::Base
  before_action :set_default_body_attributes

  def knight_moves
  end

  def testing
    return head :not_found unless current_user
    if params[:lichess_api_token]
      current_user.lichess_api_token = params[:lichess_api_token]
      current_user.save!
    end
    render plain: 'ok'
  end

  def fetch_puzzle_history
    return head :not_found unless current_user
    unless current_user.lichess_api_token
      return render plain: 'No lichess API token'
    end
    LichessApi.fetch_puzzle_activity(current_user.lichess_api_token) do |puzzle_json|
      parsed = JSON.parse(puzzle_json)
      Rails.logger.info "Processing puzzle played at #{parsed['date']}: #{puzzle_json}"
      puzzle = parsed['puzzle']
      history = current_user.user_puzzle_histories.find_or_initialize_by({
                                                                           puzzle_id: puzzle['id'],
                                                                           played_at: parsed['date']
                                                                         })
      Rails.logger.info "Puzzle history already exists" unless history.new_record?
      next unless history.new_record?
      history.assign_attributes({
                                  win: parsed['win'],
                                  rating: puzzle['rating'],
                                  solution: puzzle['solution'].join(' '),
                                  fen: puzzle['fen'],
                                  plays: puzzle['plays'],
                                  themes: puzzle['themes'].join(' '),
                                  last_move: puzzle['lastMove'],
                                })
      history.save!
    end
    render plain: 'Done'
  end

  def env
    render plain: Rails.env
  end

  def daily_games
    username_regex = /[^a-zA-Z0-9_-]/
    @chess_com_username = params[:chess_com_username].gsub(username_regex, '') if params[:chess_com_username]
    @lichess_username = params[:lichess_username].gsub(username_regex, '') if params[:lichess_username]
    @body_attributes['chess-dot-com-username'] = @chess_com_username unless @chess_com_username.blank?
    @body_attributes['lichess-username'] = @lichess_username unless @lichess_username.blank?
    @has_username = (@chess_com_username.present? || @lichess_username.present?)
  end

  def notation_trainer
  end

  def global_config
  end

  def puzzles
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
