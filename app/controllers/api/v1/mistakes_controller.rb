module Api
  module V1
    class MistakesController < ApiController
      def create
        user_puzzle = @user.user_puzzles.find_by(id: mistake_params[:user_puzzle_id])
        if user_puzzle.nil?
          render json: { message: 'user puzzle not found' }
          return
        end
        mistake = user_puzzle.mistakes.new(mistake_params)
        if mistake.save
          render json: { message: 'mistake saved' }
        else
          render json: { message: 'failed to save mistake' }
        end
      end

      private

      def mistake_params
        params.require(:mistake).permit(:user_puzzle_id, :move_index, :uci_move)
      end
    end
  end
end
