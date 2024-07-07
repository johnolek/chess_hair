module Api
  module V1
    class PuzzleResultsController < ApiController
      def create
        puzzle_result = @user.puzzle_results.new(puzzle_result_params)
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

      def puzzle_result_params
        params.require(:puzzle_result).permit(:puzzle_id, :seen_at, :done_at, :made_mistake, :skipped, :id)
      end
    end
  end
end
