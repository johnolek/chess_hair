class UserPuzzle < ApplicationRecord
  belongs_to :user
  has_and_belongs_to_many :collections

  has_many :puzzle_results
  has_many :mistakes

  has_one :lichess_puzzle, primary_key: :lichess_puzzle_id, foreign_key: :puzzle_id

  scope :with_weighted_fail_ratio, -> { select(
    arel_table[Arel.star],
    Arel.sql('(RANDOM() * 5) + ((total_fails + 1.0) / (total_solves + 1.0)) as weighted_fail_ratio')
  ) }
  scope :ordered_by_weighted_fail_ratio, -> { with_weighted_fail_ratio.order(weighted_fail_ratio: :desc) }
  scope :completed, -> { where(complete: true) }
  scope :incomplete, -> { where(complete: false) }

  scope :excluding_last_n_played, ->(user, n) do
    return all if n < 1

    recent_puzzle_ids_subquery = user.puzzle_results
      .order(created_at: :desc)
      .limit(n)
      .select(:user_puzzle_id)

    where.not(id: recent_puzzle_ids_subquery)
  end

  scope :excluding_played_within_last_n_seconds, ->(user, n) do
    n = n.to_i
    return all if n < 1
    puzzle_results_table = PuzzleResult.arel_table
    recent_time = Time.current - n
    recent_puzzle_ids_subquery = user.puzzle_results.where(puzzle_results_table[:created_at].gteq(recent_time))
      .select(:user_puzzle_id)
    where.not(id: recent_puzzle_ids_subquery)
  end

  scope :excluding_ids, ->(ids) do
    ids = Array(ids)
    return all if ids.empty?
    where.not(id: ids)
  end

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
    # Special case for random lichess puzzles solved correctly the first time
    #
    # This currently ignores time for first attempt
    if user.random_lichess_puzzles_collection.user_puzzles.include?(self)
      return true if puzzle_results.count >= 1 && puzzle_results.incorrect.count == 0
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
    if most_recent_result
      self.next_review = most_recent_result.created_at + user.config.minimum_time_between_puzzles
    end
    save!
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
      }
    )
  end
end
