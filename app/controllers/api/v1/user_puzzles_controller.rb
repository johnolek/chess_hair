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
        target_rating = lichess_puzzle_params[:target_rating].to_i
        min_rating = target_rating

        base_query = LichessPuzzle
          .rating_range(min_rating, nil)
          .with_any_of_these_themes(themes)
          .excluding_user_puzzles(@user)
          .order(rating: :asc)
          .limit(1)

        puzzle = base_query.take

        while puzzle.nil?
          min_rating = min_rating * 0.95
          query = base_query.rating_range(min_rating, nil)
          puzzle = query.take
        end

        existing_user_puzzle = @user.user_puzzles.find_by(lichess_puzzle_id: puzzle.puzzle_id)

        if existing_user_puzzle
          user_puzzle = existing_user_puzzle
        else
          user_puzzle = @user.user_puzzles.create(
            lichess_puzzle: puzzle,
            lichess_puzzle_id: puzzle.puzzle_id,
            lichess_rating: puzzle.rating,
            uci_moves: puzzle.moves,
            fen: puzzle.fen,
            )
        end
        @user.drill_mode_puzzles_collection.add_puzzle(user_puzzle)

        render json: { puzzle: user_puzzle }
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
