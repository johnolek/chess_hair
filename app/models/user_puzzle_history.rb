class UserPuzzleHistory < ApplicationRecord
  belongs_to :user

  scope :for_puzzle_id, ->(puzzle_id) { where(puzzle_id: puzzle_id) if puzzle_id.present? }

  scope :minimum_rating, ->(rating) { where('rating >= ?', rating) }
  scope :maximum_rating, ->(rating) { where('rating <= ?', rating) }

  scope :solved_correctly, -> { where(win: true) }
  scope :solved_incorrectly, -> { where(win: false) }
  scope :with_theme, ->(theme) { where('themes LIKE ?', "%#{theme}%") }
  scope :without_theme, ->(theme) { where.not('themes LIKE ?', "%#{theme}%") }

  has_one :lichess_puzzle, primary_key: :puzzle_id, foreign_key: :puzzle_id

  def related_puzzle_results
    @related_puzzle_results ||= (user.grouped_puzzle_results[puzzle_id] || []).reverse
  end

  def average_solve_duration
    required_consecutive_solves = user.config.puzzle_consecutive_solves
    results = related_puzzle_results.reject { |result| !result.correct? }
    return nil if results.empty?

    last_results = results.slice(0, required_consecutive_solves)

    total_duration = last_results.sum do |result|
      result.duration || 0
    end

    (total_duration.to_f / last_results.count) / 1000
  end

  def total_solves
    related_puzzle_results.filter { |result| result.correct? }.count
  end

  def total_fails
    related_puzzle_results.filter { |result| !result.correct? }.count
  end

  def solve_streak
    streak = 0
    related_puzzle_results.each do |result|
      break unless result.correct?
      streak += 1
    end
    streak
  end

  def complete?
    required_consecutive_solves = user.config.puzzle_consecutive_solves
    return false if related_puzzle_results.count < required_consecutive_solves
    time_goal = user.config.puzzle_time_goal
    return false if average_solve_duration && average_solve_duration > time_goal
    solve_streak >= required_consecutive_solves
  end

  def api_response
    {
      puzzle_id: puzzle_id,
      fen: lichess_puzzle.fen,
      moves: lichess_puzzle.moves.split(' '),
      rating: rating,
      themes: themes.split(' '),
      average_solve_time: average_solve_duration,
      streak: solve_streak,
      total_fails: total_fails,
      total_solves: total_solves,
      complete: complete?,
    }
  end
end
