class Api::V1::PuzzleResultsController < ApiController
  def create
    puzzle_result = @user.puzzle_results.new(puzzle_results_params)
    if puzzle_result.save
      render json: puzzle_result, status: :created
    else
      render json: { errors: puzzle_result.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    puzzle_result = @user.puzzle_results.find(params[:id])
    render json: puzzle_result
  end

  def index
    puzzle_results = @user.puzzle_results.all
    render json: puzzle_results
  end

  private

  def puzzle_results_params
    params.require(:puzzle_results).permit(:puzzle_id, :id)
  end
end
