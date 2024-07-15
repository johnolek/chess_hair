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

      private

      def setting_params
        params.permit(:key, :value)
      end

    end
  end
end
