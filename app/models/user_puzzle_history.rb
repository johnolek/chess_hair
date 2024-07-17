class UserPuzzleHistory < ApplicationRecord
  belongs_to :user

  scope :for_puzzle_id, ->(puzzle_id) { where(puzzle_id: puzzle_id) if puzzle_id.present? }

  scope :minimum_rating, ->(rating) { where('rating >= ?', rating) }
  scope :maximum_rating, ->(rating) { where('rating <= ?', rating) }

  scope :solved_correctly, -> { where(win: true) }
  scope :solved_incorrectly, -> { where(win: false) }
  scope :with_theme, ->(theme) { where('themes LIKE ?', "%#{theme}%") }
  scope :without_theme, ->(theme) { where.not('themes LIKE ?', "%#{theme}%") }

  def related_puzzle_results
    all_results[puzzle_id] || []
  end

  def all_results
    @all_results ||= user.puzzle_results.group_by(&:puzzle_id)
  end

  def average_solve_duration(last_n_solves)
    results = related_puzzle_results
    return nil if results.empty?

    last_results = results.slice(0, last_n_solves)

    total_duration = last_results.sum do |result|
      result.done_at - result.seen_at
    end

    (total_duration.to_f / last_results.count) / 1000
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
    consecutive_solves = user.config.puzzle_consecutive_solves
    return false if related_puzzle_results.count < consecutive_solves
    time_goal = user.config.puzzle_time_goal
    return false if average_solve_duration(consecutive_solves) > time_goal
    solve_streak >= consecutive_solves
  end
end
