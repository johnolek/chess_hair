module Api
  module V1
    class UsersController < ApiController
      def settings
        render json: @user.config.settings
      end

      def update_setting
        key = setting_params[:key]
        value = setting_params[:value]
        if @user.config.set_setting(key, value)
          render json: { message: "Setting updated successfully." }, status: :ok
        else
          render json: { errors: @user.config.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def get_setting
        key = setting_params[:key]
        setting = @user.config.get_setting(key)
        if setting
          render json: { key => setting }
        else
          render json: { error: "Setting not found." }, status: :not_found
        end
      end

      def info
        render json: {
          has_lichess_token: @user.lichess_api_token.present?,
          import_in_progress: @user.puzzle_import_in_progress?,
        }
      end

      def active_puzzles
        @user.recalculate_active_puzzles

        histories = @user.user_puzzle_histories.where(puzzle_id: @user.active_puzzle_ids).with_lichess_puzzle
        mapped = histories.all.map(&:api_response)
        most_recent_seen = @user.puzzle_results.order(created_at: :desc).limit(30).pluck(:puzzle_id)
        render json: {
          puzzles: mapped,
          most_recent_seen: most_recent_seen,
          random_completed_puzzle: get_random_completed_puzzle&.api_response,
          total_incorrect_puzzles_count: @user.total_incorrect_puzzles_count,
          total_filtered_puzzles_count: @user.total_filtered_puzzles_count,
          completed_filtered_puzzles_count: @user.completed_filtered_puzzles_count
        }
      end

      def import_new_puzzle_histories
        FetchPuzzleHistoryJob.perform_later(user: @user)
        render json: { message: "Importing new puzzle histories." }
      end

      private

      def get_random_completed_puzzle
        history = @user.filtered_incorrectly_solved_query
        completed = history.all.filter { |history| history.complete? }
        completed.sample
      end

      def setting_params
        params.permit(:key, :value)
      end

    end
  end
end
