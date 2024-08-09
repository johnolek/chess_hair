class FetchPuzzleHistoryJob < ApplicationJob
  queue_as :default

  def perform(user:)
    unless user.lichess_api_token
      Rails.logger.info "No lichess api token for user #{user.id}"
      return
    end

    if user.get_data('puzzle_import_running')
      Rails.logger.info "Puzzle import already running for user #{user.id}"
      return
    end

    user.set_data('puzzle_import_running', true)
    before = nil
    per_request = 50
    existing_ids = user.user_puzzle_histories.pluck(:puzzle_id)

    begin
      loop do
        imported_this_loop = 0
        puzzles_fetched = LichessApi.fetch_puzzle_activity(user.lichess_api_token, per_request, before)
        if puzzles_fetched.empty?
          user.set_data('puzzle_import_fetched_to_end', true)
          break
        end

        puzzles_fetched.each do |puzzle_json|
          parsed = JSON.parse(puzzle_json)
          before = parsed['date']
          Rails.logger.info "Processing puzzle played at #{parsed['date']}: #{puzzle_json}"
          puzzle = parsed['puzzle']
          next if existing_ids.include?(puzzle['id'])

          history = user.user_puzzle_histories.create!(
            puzzle_id: puzzle['id'],
            played_at: parsed['date'],
            win: parsed['win'],
            rating: puzzle['rating'],
            solution: puzzle['solution'].join(' '),
            fen: puzzle['fen'],
            plays: puzzle['plays'],
            themes: puzzle['themes'].join(' '),
            last_move: puzzle['lastMove']
          )

          history.save!
          history.create_user_puzzle unless history.win?
          imported_this_loop += 1
        end

        break if imported_this_loop == 0
      end
    ensure
      user.set_data('puzzle_import_running', false)
      user.set_data('puzzles_imported_at', Time.current.to_i)
    end
  end
end
