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
      puzzle_result = create(:puzzle_result, user_puzzle: user_puzzle)
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
        create(:puzzle_result, user_puzzle: puzzle1)
        expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle2]
      end
    end

    describe '.excluding_lichess_puzzle_ids' do
      it 'excludes puzzles with specific lichess puzzle ids' do
        puzzle1 = create(:user_puzzle)
        puzzle2 = create(:user_puzzle)
        expect(UserPuzzle.excluding_ids([puzzle1.id])).to eq [puzzle2]
      end
    end
  end

  describe 'instance methods' do
    describe '#calculate_average_solve_duration' do
      it 'calculates the average solve duration' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 2000)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 3000 )
        expect(user_puzzle.calculate_average_solve_duration).to eq 2.5
      end
    end

    describe '#calculate_solve_streak' do
      it 'calculates the solve streak for multiple sucesses in a row' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :incorrect, user_puzzle: user_puzzle)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        expect(user_puzzle.calculate_solve_streak).to eq 2
      end

      it 'calculates the solve streak when incorrect results present' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        create(:puzzle_result, :incorrect, user_puzzle: user_puzzle)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        expect(user_puzzle.calculate_solve_streak).to eq 1
      end

      it 'calculates the solve streak when latest result is fail' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        create(:puzzle_result, :incorrect, user_puzzle: user_puzzle)
        expect(user_puzzle.calculate_solve_streak).to eq 0
      end

      it 'calculates the solve streak when no results' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        expect(user_puzzle.calculate_solve_streak).to eq 0
      end
    end

    describe '#is_complete?' do
      it 'checks if the puzzle is complete' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 2000)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 2000)
        user_puzzle.reload
        expect(user_puzzle.is_complete?).to be true
      end

      it 'is complete if the first result for a random lichess puzzle is correct' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, :random_lichess_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :correct, user: user, user_puzzle: user_puzzle)
        user_puzzle.reload
        expect(user_puzzle.is_complete?).to be true
      end

      it 'is complete if all results for random lichess puzzles are correct' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, :random_lichess_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(3)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        user_puzzle.reload
        expect(user_puzzle.is_complete?).to be true
      end

      it 'does mark random lichess puzzles incorrect for incorrect first attempts' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, :random_lichess_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :incorrect, user: user, user_puzzle: user_puzzle)
        user_puzzle.reload
        expect(user_puzzle.is_complete?).to be false
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

        create(:puzzle_result, :correct, user_puzzle: user_puzzle)
        user_puzzle.reload
        expect(user_puzzle.total_solves).to eq 1
        expect(user_puzzle.total_fails).to eq 0

        create(:puzzle_result, :incorrect, user_puzzle: user_puzzle)
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

    describe '#percentage_complete' do
      it 'returns 100 if it  is totally complete' do
        user_puzzle = create(:user_puzzle, complete: true)
        expect(user_puzzle.percentage_complete).to eq 100
      end

      describe '#percent_time_complete' do
        it 'returns 0 if average solve time greater than 4x time goal' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(3)
          user_puzzle.average_solve_time = 13
          expect(user_puzzle.percent_time_complete).to eq 0
        end

        it 'returns 100 if average solve time less than or equal to time goal' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(3)
          user_puzzle.average_solve_time = 2
          expect(user_puzzle.percent_time_complete).to eq 100
        end

        it 'returns 50 if average solve time is halfway between time goal and 4x time goal' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(30)
          user_puzzle.average_solve_time = 75
          expect(user_puzzle.percent_time_complete).to eq 50
        end

        it 'returns 75 if average solve time is a quarter way between time goal and halfway point' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(30)
          user_puzzle.average_solve_time = 52.5
          expect(user_puzzle.percent_time_complete).to eq 75
        end

        it 'returns 25 if average solve time is three quarters way between halfway point and 4x time goal' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(30)
          user_puzzle.average_solve_time = 97.5
          expect(user_puzzle.percent_time_complete).to eq 25
        end

        it 'returns 10 if 10% complete' do
          user = create(:user)
          user_puzzle = create(:user_puzzle, user: user)
          allow(user.config).to receive(:puzzle_time_goal).and_return(100)
          user_puzzle.average_solve_time = 370
          expect(user_puzzle.percent_time_complete).to eq 10
        end
      end

      it 'returns 50 if time is complete but streak is not' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(3)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 2000)
        create(:puzzle_result, :incorrect, user_puzzle: user_puzzle, duration: 2000)
        expect(user_puzzle.percentage_complete).to eq 50
      end

      it 'does not return ridiculous numbers if solve streak greater than required' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(1)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 200000)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 200000)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 200000)
        expect(user_puzzle.percentage_complete).to eq 50
      end

      it 'returns 50 if streak is complete but time is not' do
        user = create(:user)
        user_puzzle = create(:user_puzzle, user: user)
        allow(user.config).to receive(:puzzle_consecutive_solves).and_return(2)
        allow(user.config).to receive(:puzzle_time_goal).and_return(30)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 300_000_000)
        create(:puzzle_result, :correct, user_puzzle: user_puzzle, duration: 300_000_000)
        expect(user_puzzle.percentage_complete).to eq 50
      end
    end
  end

  describe 'puzzle queries' do
    it 'can find puzzles due for review' do
      puzzle1 = create(:user_puzzle, next_review: 10.seconds.from_now)
      puzzle2 = create(:user_puzzle, next_review: 10.seconds.ago)
      due_puzzles = UserPuzzle.due_for_review
      expect(due_puzzles.count).to be 1
      expect(due_puzzles.first).to eq puzzle2
    end

    it 'includes puzzles without an explicit due date in due for review' do
      puzzle1 = create(:user_puzzle, next_review: 10.seconds.ago)
      puzzle2 = create(:user_puzzle, next_review: nil)
      due_puzzles = UserPuzzle.due_for_review
      expect(due_puzzles.count).to be 2
      expect(due_puzzles).to include(puzzle1, puzzle2)
    end

    it 'can find puzzles excluding recently played' do
      user = create(:user)
      puzzle1 = create(:user_puzzle, user: user)
      puzzle2 = create(:user_puzzle, user: user)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle1, puzzle2]

      create(:puzzle_result, user_puzzle: puzzle1)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle2]

      create(:puzzle_result, user_puzzle: puzzle2)

      expect(UserPuzzle.excluding_last_n_played(user, 1)).to eq [puzzle1]
      expect(UserPuzzle.excluding_last_n_played(user, 2)).to eq []
    end
  end
end
