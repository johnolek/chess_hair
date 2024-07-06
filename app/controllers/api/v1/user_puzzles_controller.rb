class Api::V1::UserPuzzlesController < ApplicationController
  def create
    puzzle = UserPuzzle.new(user_puzzle_params)
    if puzzle.save
      render json: user_puzzle, status: :created
    else
      render json: { errors: puzzle.errors.full_messages }
    end
  end

  def show
    puzzle = UserPuzzle.find_by(params[:id])
    render json: puzzle
  end

  private

  def user_puzzle_params
    params.require(:user_puzzle).permit(:puzzle_id, :user_id, :id)
  end
end
