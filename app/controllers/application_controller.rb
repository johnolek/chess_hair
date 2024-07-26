require 'json'
require 'uri'
require 'base64'
require 'openssl'
require 'net/http'

class ApplicationController < ActionController::Base
  before_action :set_default_body_attributes
  before_action :authenticate_user!, only: [:puzzles]

  def knight_moves
  end

  def authenticate_with_lichess
    return render plain: 'Must be logged in' unless current_user

    code_verifier = SecureRandom.urlsafe_base64(64)
    current_user.lichess_code_verifier = code_verifier
    current_user.save!

    code_challenge = Base64.urlsafe_encode64(OpenSSL::Digest::SHA256.digest(code_verifier)).tr('=', '')

    client_id = 'chess.hair'
    redirect_uri = url_for(controller: 'application', action: 'save_lichess_code')
    scope = 'puzzle:read'
    response_type = 'code'
    code_challenge_method = 'S256'

    oauth_params = {
      client_id: client_id,
      redirect_uri: redirect_uri,
      response_type: response_type,
      scope: scope,
      code_challenge: code_challenge,
      code_challenge_method: code_challenge_method
    }

    oauth_url = "https://lichess.org/oauth?#{oauth_params.to_query}"

    redirect_to oauth_url, allow_other_host: true
  end

  def save_lichess_code
    return render plain: 'Must be logged in' unless current_user
    code = params['code']
    current_user.lichess_code = code
    current_user.save!
    token_request_uri = URI('https://lichess.org/api/token')
    token_request_params = {
      'client_id' => 'chess.hair',
      'code' => current_user.lichess_code,
      'redirect_uri' => url_for(controller: 'application', action: 'save_lichess_code'),
      'grant_type' => 'authorization_code',
      'code_verifier' => current_user.lichess_code_verifier,
    }
    http = Net::HTTP.new(token_request_uri.host, token_request_uri.port)
    http.use_ssl = true
    request = Net::HTTP::Post.new(token_request_uri)
    request.set_form_data(token_request_params)
    response = http.request(request)
    access_token = JSON.parse(response.body)['access_token']
    if access_token
      current_user.lichess_api_token = access_token
      current_user.lichess_code_verifier = nil
      current_user.lichess_code = nil
      current_user.set_data('lichess_token_api_response', response.body)
      current_user.set_data('lichess_token_expires_at', Time.current.to_i + JSON.parse(response.body)['expires_in'])
      current_user.save!
      FetchPuzzleHistoryJob.perform_later(user: current_user)
    end
    redirect_to url_for(controller: 'application', action: 'puzzles')
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
