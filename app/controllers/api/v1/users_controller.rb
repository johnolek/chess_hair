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
        if @user.active_puzzle_ids&.count < 1
          @user.recalculate_active_puzzles
        end

        if @user.active_puzzle_ids.count < 1
          return render json: []
        end

        histories = @user.user_puzzle_histories.where(puzzle_id: @user.active_puzzle_ids)
        mapped = histories.all.map do |history|
          {
            puzzle_id: history.puzzle_id,
            fen: history.fen,
            last_move: history.last_move,
            solution: history.solution.split(' '),
            rating: history.rating,
            themes: history.themes.split(' ')
          }
        end
        render json: mapped
      end

      private

      def setting_params
        params.permit(:key, :value)
      end

    end
  end
end
