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

      def active_puzzles
        @user.recalculate_active_puzzles

        histories = @user.user_puzzle_histories.where(puzzle_id: @user.active_puzzle_ids)
        mapped = histories.all.map(&:api_response)
        render json: {puzzles: mapped, total_incorrect_puzzles_count: @user.total_incorrect_puzzles_count, total_filtered_puzzles_count: @user.total_filtered_puzzles_count, completed_filtered_puzzles_count: @user.completed_filtered_puzzles_count}
      end

      private

      def setting_params
        params.permit(:key, :value)
      end

    end
  end
end
