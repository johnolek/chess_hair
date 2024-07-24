class UserPuzzle < ApplicationRecord
  belongs_to :user

  has_many :puzzle_results, ->(user_puzzle) { where(puzzle_id: user_puzzle.lichess_puzzle_id) }, through: :user, source: :puzzle_results

  has_one :lichess_puzzle, primary_key: :lichess_puzzle_id, foreign_key: :puzzle_id

  def calculate_average_solve_duration
    required_consecutive_solves = user.config.puzzle_consecutive_solves
    results = puzzle_results.correct.limit(required_consecutive_solves)
    return nil if results.empty?

    last_results = results.slice(0, required_consecutive_solves)

    total_duration = last_results.sum do |result|
      result.duration || 0
    end

    (total_duration.to_f / last_results.count) / 1000
  end

  def solve_streak
    streak = 0
    puzzle_results.order(created_at: :desc).each do |result|
      break unless result.correct?
      streak += 1
    end
    streak
  end

  def complete?
    required_consecutive_solves = user.config.puzzle_consecutive_solves
    return false if puzzle_results.count < required_consecutive_solves
    time_goal = user.config.puzzle_time_goal
    return false if average_solve_time && average_solve_time > time_goal
    solve_streak >= required_consecutive_solves
  end

  def recalculate_stats
    update!(
      total_solves: puzzle_results.correct.count,
      total_fails: puzzle_results.incorrect.count,
      average_solve_time: calculate_average_solve_duration,
      solve_streak: solve_streak,
      complete: complete?
    )
  end
end
