module Api
  module V1
    class ApiController < ApplicationController
      before_action do
        authenticate_user!
        @user = current_user
      end
    end
  end
end
