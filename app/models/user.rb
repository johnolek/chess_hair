class User < ApplicationRecord
  after_initialize :init_active_puzzle_ids
  after_commit :maybe_fetch_more_puzzles, on: :update
  after_create :create_default_collections

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :user_puzzles
  has_many :mistakes, through: :user_puzzles
  has_many :puzzle_results, through: :user_puzzles
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

  def create_default_collections
    collections.create!(name: 'favorites')
    collections.create!(name: 'failed_lichess_puzzles')
  end

  def get_collection(name)
    collections.find_or_initialize_by(name: name)
  end

  def random_lichess_puzzles_collection
    get_collection('random_lichess_puzzles')
  end

  def favorites_collection
    get_collection('favorites')
  end

  def failed_lichess_puzzles_collection
    collections.find_by(name: 'failed_lichess_puzzles')
  end

  def add_favorite(user_puzzle)
    favorites_collection.user_puzzles << user_puzzle
    favorites_collection.save!
  end

  def remove_favorite(user_puzzle)
    favorites_collection.user_puzzles.delete(user_puzzle)
    favorites_collection.save!
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

    existing = base_query.where(id: active_puzzle_ids)

    batch_size = config.puzzle_batch_size

    if existing.count > batch_size
      self.active_puzzle_ids = existing.pluck(:id).sample(batch_size)
      save!
      return
    end

    return if existing.count == batch_size

    self.active_puzzle_ids = existing.pluck(:id)

    additional_required = batch_size - active_puzzle_ids.count

    extra = base_query.random_order.limit(additional_required).pluck(:id)

    add_puzzle_ids(extra)
  end

  def active_puzzles
    user_puzzles.where(id: active_puzzle_ids)
  end

  def random_lichess_puzzle
    max_id = LichessPuzzle.maximum(:id)
    random_id = rand(1..max_id)
    puzzle = LichessPuzzle.where('id > ?', random_id).limit(1).first

    user_puzzles.build(
      lichess_puzzle: puzzle,
      lichess_puzzle_id: puzzle.puzzle_id,
      lichess_rating: puzzle.rating,
      uci_moves: puzzle.moves,
      fen: puzzle.fen
    )
  end

  def next_puzzle(previous_puzzle_id = nil)
    base_query = filtered_user_puzzles.excluding_ids(previous_puzzle_id)

    odds_of_random = config.odds_of_random_completed

    if rand < odds_of_random
      random_completed = base_query.completed
      return random_completed.random_order.first if random_completed.any?
    end

    minimum_puzzles_between = config.minimum_puzzles_between_reviews.to_i
    minimum_time_between = config.minimum_time_between_puzzles.to_i

    without_last_n_played = base_query.excluding_last_n_played(self, minimum_puzzles_between)
    without_last_played_within_n_seconds = base_query.excluding_played_within_last_n_seconds(self, minimum_time_between)

    excluding_recently_seen = without_last_n_played.and(without_last_played_within_n_seconds)

    in_order = [
      active_puzzles.and(excluding_recently_seen),
      excluding_recently_seen,
      without_last_n_played,
      without_last_played_within_n_seconds,
      base_query,
      user_puzzles.excluding_ids(previous_puzzle_id),
    ]

    in_order.each do |query|
      return query.random_order.first if query.any?
    end

    nil
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
    reload # ensure we get the latest imported at timestamp
    return if puzzle_import_in_progress?
    last_fetched = get_data('puzzles_imported_at', Time.current.to_i)
    difference = Time.current.to_i - last_fetched
    return unless difference > 60 * 60 * 12
    Rails.logger.info("Scheduling puzzle history fetch for user #{id} since it has been #{difference} seconds since last fetch")
    FetchPuzzleHistoryJob.perform_later(user: self)
  end
end
