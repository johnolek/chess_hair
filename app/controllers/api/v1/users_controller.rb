module Api
  module V1
    class UsersController < ApiController
      before_action :find_user_puzzle, only: %i[add_favorite remove_favorite]

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

        render json: {
          puzzles: @user.active_puzzles.includes(:lichess_puzzle),
          total_incorrect_puzzles_count: @user.user_puzzles.count,
          total_filtered_puzzles_count: @user.filtered_user_puzzles.count,
          completed_filtered_puzzles_count: @user.filtered_user_puzzles.where(complete: true).count,
        }
      end

      def next_puzzle
        render json: @user.next_puzzle(params[:exclude_puzzle_id])
      end

      def import_new_puzzle_histories
        FetchPuzzleHistoryJob.perform_later(user: @user)
        render json: { message: "Importing new puzzle histories." }
      end

      def add_favorite
        @user.add_favorite(@user_puzzle)
        render json: { message: "Puzzle added to favorites." }
      end

      def remove_favorite
        @user.remove_favorite(@user_puzzle)
        render json: { message: "Puzzle removed from favorites." }
      end

      private

      def setting_params
        params.permit(:key, :value)
      end

      def user_puzzle_id
        params.require(:user_puzzle_id)
      end

      def find_user_puzzle
        @user_puzzle = @user.user_puzzles.find(user_puzzle_id)
      end

    end
  end
end
