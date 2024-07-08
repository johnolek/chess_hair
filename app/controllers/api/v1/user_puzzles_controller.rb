module Api
  module V1
    class UserPuzzlesController < ApiController
      def create
        new_puzzle = false
        puzzle = @user.user_puzzles.find_or_create_by(user_puzzle_params) do |p|
          new_puzzle = p.new_record?
        end
        if puzzle.persisted?
          render json: puzzle, status: new_puzzle ? :created : :ok
        else
          render json: { errors: puzzle.errors.full_messages }
        end
      end

      def show
        puzzle = @user.user_puzzles.find_by(params[:id])
        render json: puzzle
      end

      def index
        all = @user.user_puzzles.all
        render json: all
      end

      private

      def user_puzzle_params
        params.require(:user_puzzle).permit(:puzzle_id, :seen_at, :done_at, :skipped, :made_mistake)
      end
    end
  end
end
