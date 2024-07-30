class User < ApplicationRecord
  after_initialize :init_active_puzzle_ids
  after_commit :maybe_fetch_more_puzzles, on: :update
  after_create :create_default_collection

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :user_puzzles
  has_many :puzzle_results
  has_one :config
  has_many :user_puzzle_histories
  has_many :collections

  serialize :active_puzzle_ids, coder: YAML

  def init_active_puzzle_ids
    self.active_puzzle_ids ||= []
  end

  def config
    super || build_config
  end

  def create_default_collection
    collections.create!(name: 'favorites')
  end

  def favorites
    collections.find_by(name: 'favorites')&.user_puzzles || []
  end

  def add_favorite(user_puzzle)
    collection = collections.find_by(name: 'favorites')
    collection.user_puzzles << user_puzzle
    collection.save!
  end

  def remove_favorite(user_puzzle)
    collection = collections.find_by(name: 'favorites')
    collection.user_puzzles.delete(user_puzzle)
    collection.save!
  end

  def grouped_puzzle_results
    @grouped_puzzle_results ||= puzzle_results.group_by(&:puzzle_id)
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

  def maybe_fetch_more_puzzles
    return unless lichess_api_token
    return if puzzle_import_in_progress?
    last_fetched = get_data('puzzles_imported_at', Time.current.to_i)
    difference = Time.current.to_i - last_fetched
    return unless difference > 60 * 60 * 12
    Rails.logger.info("Scheduling puzzle history fetch for user #{id} since it has been #{difference} seconds since last fetch")
    FetchPuzzleHistoryJob.perform_later(user: self)
  end
end
