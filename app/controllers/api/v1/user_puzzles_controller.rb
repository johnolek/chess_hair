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

      def lichess_puzzle
        themes = lichess_puzzle_params[:themes]&.split(',') || []
        query = LichessPuzzle
          .high_quality
          .rating_range(lichess_puzzle_params[:min_rating], lichess_puzzle_params[:max_rating])
          .with_any_of_these_themes(themes)

        puzzle = query.random_record
        user_puzzle = @user.user_puzzles.build(
          lichess_puzzle: puzzle,
          lichess_puzzle_id: puzzle.puzzle_id,
          lichess_rating: puzzle.rating,
          uci_moves: puzzle.moves,
          fen: puzzle.fen,
        )

        render json: user_puzzle
      end

      private

      def lichess_puzzle_params
        params.permit(:min_rating, :max_rating, :themes)
      end

      def user_puzzle_params
        params.require(:user_puzzle).permit(:puzzle_id, :made_mistake)
      end
    end
  end
end
