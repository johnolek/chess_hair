class FetchPuzzleHistoryJob < ApplicationJob
  queue_as :default

  def perform(user:)
    unless user.lichess_api_token
      return render plain: 'No lichess API token'
    end
    before = nil
    per_request = 100
    keep_going = true
    imported = 0
    while keep_going
      LichessApi.fetch_puzzle_activity(user.lichess_api_token, per_request, before) do |puzzle_json|
        parsed = JSON.parse(puzzle_json)
        before = parsed['date']
        Rails.logger.info "Processing puzzle played at #{parsed['date']}: #{puzzle_json}"
        puzzle = parsed['puzzle']
        history = user.user_puzzle_histories.find_or_initialize_by(
          {
            puzzle_id: puzzle['id'],
            played_at: parsed['date']
          }
        )
        Rails.logger.info "Puzzle history already exists" unless history.new_record?
        unless history.new_record?
          keep_going = false
          break
        end
        history.assign_attributes(
          {
            win: parsed['win'],
            rating: puzzle['rating'],
            solution: puzzle['solution'].join(' '),
            fen: puzzle['fen'],
            plays: puzzle['plays'],
            themes: puzzle['themes'].join(' '),
            last_move: puzzle['lastMove'],
          }
        )
        history.save!
        imported += 1
      end
    end
  end
end
