module Api
  module V1
    class UsersController < ApiController
      def settings
        render json: @user.config.settings
      end
    end
  end
end
