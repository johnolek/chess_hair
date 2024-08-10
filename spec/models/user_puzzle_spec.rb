require 'rails_helper'

RSpec.describe UserPuzzle, type: :model do
  describe 'associations' do
    it 'belongs to user' do
      user_puzzle = create(:user_puzzle)
      expect(user_puzzle.user).to be_present
    end

    it 'has and belongs to many collections' do
      user_puzzle = create(:user_puzzle)
      collection = create(:collection)
      user_puzzle.collections << collection
      expect(user_puzzle.collections).to include(collection)
    end

    it 'has many puzzle results through user' do
      user = create(:user)
      user_puzzle = create(:user_puzzle, user: user)
      puzzle_result = create(:puzzle_result, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
      expect(user_puzzle.puzzle_results).to include(puzzle_result)
    end

    it 'has one lichess puzzle' do
      lichess_puzzle = create(:lichess_puzzle)
      user_puzzle = create(:user_puzzle, lichess_puzzle_id: lichess_puzzle.puzzle_id)
      expect(user_puzzle.lichess_puzzle).to eq(lichess_puzzle)
    end
  end

  describe 'scopes' do
    describe '.with_weighted_fail_ratio' do
      it 'calculates weighted fail ratio' do
        user_puzzle = create(:user_puzzle)
        puzzles = UserPuzzle.with_weighted_fail_ratio
        expect(puzzles.first.attributes).to include('weighted_fail_ratio')
      end
    end

    describe '.completed' do
      it 'returns only completed puzzles' do
        user_puzzle1 = create(:user_puzzle, complete: true)
        user_puzzle2 = create(:user_puzzle, complete: false)
        expect(UserPuzzle.completed).to eq [user_puzzle1]
      end
    end

    describe '.incomplete' do
      it 'returns only incomplete puzzles' do
        user_puzzle1 = create(:user_puzzle, complete: false)
        user_puzzle2 = create(:user_puzzle, complete: false)
        expect(UserPuzzle.incomplete).to eq [user_puzzle1, user_puzzle2]
      end
    end

    describe '.excluding_last_n_played' do
      it 'excludes puzzles played in the last n times' do
        user = create(:user)
        puzzle1 = create(:user_puzzle, user: user)
        puzzle2 = create(:user_puzzle, user: user)
        create(:puzzle_result, user: user, puzzle_id: puzzle1.lichess_puzzle_id)
        expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle2]
      end
    end

    describe '.excluding_played_within_last_n_seconds' do
      it 'excludes puzzles played within the last n seconds' do
        Timecop.freeze do
          user = create(:user)
          puzzle1 = create(:user_puzzle, user: user)
          puzzle2 = create(:user_puzzle, user: user)
          create(:puzzle_result, user: user, puzzle_id: puzzle1.lichess_puzzle_id)
          expect(UserPuzzle.excluding_played_within_last_n_seconds(user, 1)).to eq [puzzle2]
        end
      end
    end

    describe '.excluding_lichess_puzzle_ids' do
      it 'excludes puzzles with specific lichess puzzle ids' do
        puzzle1 = create(:user_puzzle)
        puzzle2 = create(:user_puzzle)
        expect(UserPuzzle.excluding_lichess_puzzle_ids([puzzle1.lichess_puzzle_id])).to eq [puzzle2]
      end
    end
  end

  describe 'instance methods' do
    describe '#calculate_average_solve_duration' do
      it 'calculates the average solve duration' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id, duration: 2000)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id, duration: 3000 )
        expect(user_puzzle.calculate_average_solve_duration).to eq 2.5
      end
    end

    describe '#calculate_solve_streak' do
      it 'calculates the solve streak for multiple sucesses in a row' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :incorrect, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        expect(user_puzzle.calculate_solve_streak).to eq 2
      end

      it 'calculates the solve streak when incorrect results present' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        create(:puzzle_result, :incorrect, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        expect(user_puzzle.calculate_solve_streak).to eq 1
      end

      it 'calculates the solve streak when latest result is fail' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        create(:puzzle_result, :incorrect, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        expect(user_puzzle.calculate_solve_streak).to eq 0
      end

      it 'calculates the solve streak when no results' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        expect(user_puzzle.calculate_solve_streak).to eq 0
      end
    end

    describe '#complete?' do
      it 'checks if the puzzle is complete' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id, duration: 2000)
        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id, duration: 2000)
        user_puzzle.reload
        expect(user_puzzle.complete?).to be true
      end
    end

    describe '#recalculate_stats' do
      it 'recalculates the stats' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        user_puzzle.recalculate_stats
        user_puzzle.reload

        expect(user_puzzle.total_solves).to eq 0
        expect(user_puzzle.total_fails).to eq 0

        create(:puzzle_result, :correct, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        user_puzzle.reload
        expect(user_puzzle.total_solves).to eq 1
        expect(user_puzzle.total_fails).to eq 0

        create(:puzzle_result, :incorrect, user: user, puzzle_id: user_puzzle.lichess_puzzle_id)
        user_puzzle.reload
        expect(user_puzzle.total_solves).to eq 1
        expect(user_puzzle.total_fails).to eq 1
      end
    end

    describe '#as_json' do
      it 'returns the correct json representation' do
        user_puzzle = create(:user_puzzle)
        json = user_puzzle.as_json
        expect(json.keys).to include("id", "fen", "average_solve_time", "solve_streak", "total_fails", "total_solves", "complete", "lichess_puzzle_id", "lichess_rating", "moves", "themes")
      end
    end
  end

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
