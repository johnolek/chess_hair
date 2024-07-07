class Api::V1::ApiController < ApplicationController
  before_action do
    authenticate_user!
    @user = current_user
  end
end
