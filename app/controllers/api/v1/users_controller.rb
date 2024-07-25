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

        most_recent_seen = @user.puzzle_results.order(created_at: :desc).limit(30).pluck(:puzzle_id)
        render json: {
          puzzles: @user.active_puzzles,
          random_completed_puzzle: @user.filtered_user_puzzles.where(complete: true).sample,
          most_recent_seen: most_recent_seen,
          total_incorrect_puzzles_count: @user.user_puzzles.count,
          total_filtered_puzzles_count: @user.filtered_user_puzzles.count,
          completed_filtered_puzzles_count: @user.filtered_user_puzzles.where(complete: true).count,
        }
      end

      def import_new_puzzle_histories
        FetchPuzzleHistoryJob.perform_later(user: @user)
        render json: { message: "Importing new puzzle histories." }
      end

      private

      def setting_params
        params.permit(:key, :value)
      end

    end
  end
end
