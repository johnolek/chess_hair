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
        required_puzzles = 20
        themes = lichess_puzzle_params[:themes]&.split(',') || []
        target_rating = lichess_puzzle_params[:target_rating].to_i
        min_rating = target_rating - 100
        max_rating = target_rating + 100

        base_query = LichessPuzzle.with_any_of_these_themes(themes)

        query = base_query.high_quality.rating_range(min_rating, max_rating)
        count = query.count

        if count < required_puzzles
          # Not enough in the high quality, so try the rest
          query = base_query.rating_range(min_rating, max_rating)

          # Expand rating range until we have enough puzzles
          while query.count < required_puzzles
            max_rating = max_rating * 1.25
            min_rating = min_rating * 0.95
            query = base_query.rating_range(min_rating, max_rating)
          end
        end

        puzzle = query.random_record

        user_puzzle = @user.user_puzzles.build(
          lichess_puzzle: puzzle,
          lichess_puzzle_id: puzzle.puzzle_id,
          lichess_rating: puzzle.rating,
          uci_moves: puzzle.moves,
          fen: puzzle.fen,
        )

        render json: { puzzle: user_puzzle, rating_range: [min_rating, max_rating] }
      end

      private

      def lichess_puzzle_params
        params.permit(:target_rating, :themes)
      end

      def user_puzzle_params
        params.require(:user_puzzle).permit(:puzzle_id, :made_mistake)
      end
    end
  end
end
