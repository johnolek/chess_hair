class User < ApplicationRecord
  after_initialize :init_active_puzzle_ids

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :user_puzzles
  has_many :puzzle_results
  has_one :config
  has_many :user_puzzle_histories

  serialize :active_puzzle_ids, coder: YAML

  def init_active_puzzle_ids
    self.active_puzzle_ids ||= []
  end

  def config
    super || build_config
  end

  def incorrectly_solved_puzzles_query
    user_puzzle_histories.solved_incorrectly
  end

  def total_incorrect_puzzles_count
    incorrectly_solved_puzzles_query.count
  end

  def total_filtered_puzzles_count
    filtered_incorrectly_solved_query.count
  end

  def completed_filtered_puzzles_count
    filtered_incorrectly_solved_query.all.filter { |history| history.complete? }.count
  end

  def filtered_incorrectly_solved_query
    query = incorrectly_solved_puzzles_query
    query = query.minimum_rating(config.puzzle_min_rating) if config.puzzle_min_rating
    query = query.maximum_rating(config.puzzle_max_rating) if config.puzzle_max_rating
    query
  end

  def recalculate_active_puzzles
    remove_complete_from_active
    remove_filtered_puzzles_from_active

    batch_size = config.puzzle_batch_size

    if active_puzzle_ids.count > batch_size
      self.active_puzzle_ids = active_puzzle_ids.slice(0, batch_size)
      save!
      return
    end

    return if active_puzzle_ids.count == batch_size

    histories_query = filtered_incorrectly_solved_query.where.not(puzzle_id: active_puzzle_ids).with_lichess_puzzle

    unsolved = histories_query.random_order.all.filter { |history| !history.complete? }

    additional_required = batch_size - active_puzzle_ids.count

    puzzle_ids = unsolved.sample(additional_required).map(&:puzzle_id)

    add_puzzle_ids(puzzle_ids)
  end

  def remove_complete_from_active
    return unless active_puzzle_ids.count > 0
    histories = user_puzzle_histories.where(puzzle_id: active_puzzle_ids)
    complete = histories.all.filter { | history| history.complete? }
    ids = complete.map(&:puzzle_id)
    remove_puzzle_ids(ids)
  end

  def remove_filtered_puzzles_from_active
    return unless active_puzzle_ids.count > 0
    included_active_ids = filtered_incorrectly_solved_query.where(puzzle_id: active_puzzle_ids).map(&:puzzle_id)
    not_included = active_puzzle_ids - included_active_ids
    remove_puzzle_ids(not_included)
  end

  def add_puzzle_id(puzzle_id)
    self.active_puzzle_ids << puzzle_id unless self.active_puzzle_ids.include?(puzzle_id)
    save
  end

  def add_puzzle_ids(puzzle_ids)
    puzzle_ids.each do |puzzle_id|
      self.active_puzzle_ids << puzzle_id unless self.active_puzzle_ids.include?(puzzle_id)
    end
    save!
  end

  def remove_puzzle_id(puzzle_id)
    self.active_puzzle_ids.delete(puzzle_id)
    save
  end

  def remove_puzzle_ids(puzzle_ids)
    puzzle_ids.each do |puzzle_id|
      self.active_puzzle_ids.delete(puzzle_id)
    end
    save!
  end

  def has_puzzle_id?(puzzle_id)
    self.active_puzzle_ids.include?(puzzle_id)
  end

  def get_data(key, default = nil)
    data[key] || default
  end

  def set_data(key, value)
    self.data = data.merge({key => value})
    save!
  end

  def puzzle_import_in_progress?
    get_data('puzzle_import_running', false)
  end
end
