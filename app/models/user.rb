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

  def grouped_puzzle_results
    @grouped_puzzle_results ||= puzzle_results.group_by(&:puzzle_id)
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
    query.includes(:lichess_puzzle)
    query
  end

  def filtered_user_puzzles
    query = user_puzzles.where('lichess_rating >= ?', config.puzzle_min_rating) if config.puzzle_min_rating
    query = query.where('lichess_rating <= ?', config.puzzle_max_rating) if config.puzzle_max_rating
    query
  end

  def recalculate_active_puzzles
    base_query = user_puzzles.where(complete: false)
    base_query = base_query.where('lichess_rating >= ?', config.puzzle_min_rating) if config.puzzle_min_rating
    base_query = base_query.where('lichess_rating <= ?', config.puzzle_max_rating) if config.puzzle_max_rating

    existing = base_query.where(lichess_puzzle_id: active_puzzle_ids)

    batch_size = config.puzzle_batch_size

    if existing.count > batch_size
      self.active_puzzle_ids = existing.pluck(:lichess_puzzle_id).sample(batch_size)
      save!
      return
    end

    return if existing.count == batch_size

    self.active_puzzle_ids = existing.pluck(:lichess_puzzle_id)

    additional_required = batch_size - active_puzzle_ids.count

    extra = base_query.random_order.limit(additional_required).pluck(:lichess_puzzle_id)

    add_puzzle_ids(extra)
  end

  def active_puzzles
    user_puzzles.where(lichess_puzzle_id: active_puzzle_ids)
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
    self.data = data.merge({ key => value })
    save!
  end

  def puzzle_import_in_progress?
    get_data('puzzle_import_running', false)
  end
end
