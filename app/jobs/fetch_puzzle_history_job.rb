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

    before = nil
    per_request = 20
    keep_going = true
    imported = 0
    fetched_existing = false
    oldest_saved = user.user_puzzle_histories.minimum(:played_at)
    user.set_data('puzzle_import_running', true)

    while keep_going
      batch_count = 0

      LichessApi.fetch_puzzle_activity(user.lichess_api_token, per_request, before) do |puzzle_json|
        batch_count += 1
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
          fetched_existing = true
          next
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
        oldest_saved = parsed['date'] if oldest_saved.nil? || parsed['date'] < oldest_saved
        imported += 1
      end

      break if batch_count == 0

      if fetched_existing && oldest_saved
        # The current batch contained at least one puzzle that was already fetched, so skip to the oldest fetched
        # in case we missed some the first time.
        before = oldest_saved
      end
    end
  ensure
    user.set_data('puzzle_import_running', false)
  end
end
