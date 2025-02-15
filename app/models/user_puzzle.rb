class UserPuzzle < ApplicationRecord
  belongs_to :user
  has_and_belongs_to_many :collections

  has_many :puzzle_results, dependent: :destroy
  has_many :mistakes, dependent: :destroy

  has_one :lichess_puzzle, primary_key: :lichess_puzzle_id, foreign_key: :puzzle_id
  has_one :user_puzzle_history, primary_key: :lichess_puzzle_id, foreign_key: :puzzle_id

  scope :with_weighted_fail_ratio, lambda {
                                     select(
                                       arel_table[Arel.star],
                                       Arel.sql('(RANDOM() * 5) + ((total_fails + 1.0) / (total_solves + 1.0)) as weighted_fail_ratio')
                                     )
                                   }
  scope :ordered_by_weighted_fail_ratio, -> { with_weighted_fail_ratio.order(weighted_fail_ratio: :desc) }
  scope :completed, -> { where(complete: true) }
  scope :incomplete, -> { where(complete: false) }

  scope :excluding_last_n_played, lambda { |user, n|
    return all if n < 1

    recent_puzzle_ids_subquery = user.puzzle_results
                                     .order(created_at: :desc)
                                     .limit(n)
                                     .select(:user_puzzle_id)

    where.not(id: recent_puzzle_ids_subquery)
  }

  scope :due_for_review, lambda {
    where(next_review: ..Time.current).or(where(next_review: nil))
  }

  scope :excluding_ids, lambda { |ids|
    ids = Array(ids)
    return all if ids.empty?

    where.not(id: ids)
  }

  scope :without_results, lambda {
    left_outer_joins(:puzzle_results).where(puzzle_results: { id: nil })
  }

  def calculate_average_solve_duration
    required_consecutive_solves = user.config.puzzle_consecutive_solves
    results = puzzle_results
              .correct
              .order(created_at: :desc)
              .limit(required_consecutive_solves)
    return nil if results.empty?

    last_results = results.slice(0, required_consecutive_solves)

    total_duration = last_results.sum do |result|
      result.duration || 0
    end

    (total_duration.to_f / last_results.count) / 1000
  end

  def calculate_solve_streak
    streak = 0
    puzzle_results.order(created_at: :desc).each do |result|
      break unless result.correct?

      streak += 1
    end
    streak
  end

  def is_complete?
    # Puzzles in other collections are considered complete if solved the first time
    if !user.failed_lichess_puzzles_collection.user_puzzles.include?(self) && (puzzle_results.count >= 1 && puzzle_results.incorrect.count == 0)
      return true
    end

    required_consecutive_solves = user.config.puzzle_consecutive_solves
    return false unless solve_streak >= required_consecutive_solves

    time_goal = user.config.puzzle_time_goal
    average_solve_time && average_solve_time <= time_goal
  end

  def recalculate_stats
    self.total_solves = puzzle_results.correct.count
    self.total_fails = puzzle_results.incorrect.count
    self.average_solve_time = calculate_average_solve_duration
    self.solve_streak = calculate_solve_streak
    self.complete = is_complete?
    self.last_played = puzzle_results.last&.created_at
    most_recent_result = puzzle_results.order(created_at: :desc).first
    self.next_review = most_recent_result.created_at + user.config.minimum_time_between_puzzles if most_recent_result
    save!
  end

  def percentage_complete
    return 100 if complete?
    return 0 if total_solves == 0

    required_consecutive_solves = user.config.puzzle_consecutive_solves
    streak_percent = if solve_streak >= required_consecutive_solves
                       100
                     else
                       (solve_streak / required_consecutive_solves.to_f) * 100
                     end
    time_percent = percent_time_complete

    (streak_percent * 0.5) + (time_percent * 0.5)
  end

  def percent_time_complete
    return 0 if average_solve_time.nil?

    time_goal = user.config.puzzle_time_goal
    max_multiplier = 4
    max_time = max_multiplier * time_goal

    return 100 if average_solve_time <= time_goal
    return 0 if average_solve_time >= max_time

    time_difference = average_solve_time - time_goal
    total_time_range = max_time - time_goal
    100 - (time_difference / total_time_range * 100)
  end

  def as_json(options = nil)
    super.slice(
      'id',
      'fen',
      'average_solve_time',
      'solve_streak',
      'total_fails',
      'total_solves',
      'complete',
      'lichess_puzzle_id',
      'lichess_rating'
    ).merge(
      {
        'moves' => uci_moves.split(' '),
        'themes' => lichess_puzzle&.themes&.split(' '),
        'percentage_complete' => percentage_complete,
        'results' => puzzle_results,
        'first_failure' => user_puzzle_history
      }
    )
  end
end
