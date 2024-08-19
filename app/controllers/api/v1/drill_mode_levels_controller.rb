module Api
  module V1
    class DrillModeLevelsController < ApiController
      def index
        render json: @user.drill_mode_levels
      end

      def update
        drill_mode_level = @user.drill_mode_levels.find_by(theme: update_params[:theme])
        if drill_mode_level.nil?
          render json: { message: 'drill mode level not found' }, status: :not_found
          return
        end
        if drill_mode_level.update(rating: update_params[:new_rating])
          render json: { message: 'drill mode level updated', updated_level: drill_mode_level }
        else
          render json: { message: 'failed to update drill mode level', error: drill_mode_level.errors.full_messages }
        end
      end

      private

      def update_params
        params.permit(:theme, :new_rating)
      end
    end
  end
end
