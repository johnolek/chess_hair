module Api
  module V1
    class PuzzleResultsController < ApiController
      def create
        puzzle_result = @user.puzzle_results.new(puzzle_result_params)
        if puzzle_result.save
          updated_puzzle = @user.user_puzzles.find_by(lichess_puzzle_id: puzzle_result.puzzle_id)
          updated_puzzle.reload
          render json: { result: puzzle_result, puzzle: updated_puzzle }, status: :created
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
        params.require(:puzzle_result).permit(:puzzle_id, :duration, :made_mistake, :id)
      end
    end
  end
end
