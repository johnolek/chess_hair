require 'rails_helper'

RSpec.describe UserPuzzle, type: :model do
  describe 'puzzle queries' do
    it 'can find puzzles excluding recently played' do
      user = create(:user)
      puzzle1 = create(:user_puzzle, user: user)
      puzzle2 = create(:user_puzzle, user: user)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle1, puzzle2]

      create(:puzzle_result, user: user, puzzle_id: puzzle1.lichess_puzzle_id)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle2]

      create(:puzzle_result, user: user, puzzle_id: puzzle2.lichess_puzzle_id)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle1]
      expect(UserPuzzle.excluding_last_n_played(user, 2)).to eq []
    end

    it 'can find puzzles excluding those played within a specific timeframe' do
      Timecop.freeze do
        user = create(:user)
        puzzle1 = create(:user_puzzle, user: user)
        puzzle2 = create(:user_puzzle, user: user)

        expect(UserPuzzle.excluding_played_within_last_n_seconds(user, 1)).to eq [puzzle1, puzzle2]

        create(:puzzle_result, user: user, puzzle_id: puzzle1.lichess_puzzle_id)

        expect(UserPuzzle.excluding_played_within_last_n_seconds(user, 1)).to eq [puzzle2]

        create(:puzzle_result, user: user, puzzle_id: puzzle2.lichess_puzzle_id)

        expect(UserPuzzle.excluding_played_within_last_n_seconds(user, 1)).to eq []

        Timecop.travel(2.seconds.from_now) do
          expect(UserPuzzle.excluding_played_within_last_n_seconds(user, 1)).to eq [puzzle1, puzzle2]
        end
      end
    end
  end
end
