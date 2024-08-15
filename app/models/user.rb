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
    favorites_collection.add_puzzle(user_puzzle)
  end

  def remove_favorite(user_puzzle)
    favorites_collection.remove_puzzle(user_puzzle)
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

  def create_random_lichess_puzzle
    min = config.puzzle_min_rating
    max = config.puzzle_max_rating
    puzzle = LichessPuzzle
      .excluding_user_puzzles(self)
      .high_quality
      .where(rating: min..max)
      .random_record

    return nil unless puzzle

    new_user_puzzle = user_puzzles.create!(
      lichess_puzzle: puzzle,
      lichess_puzzle_id: puzzle.puzzle_id,
      lichess_rating: puzzle.rating,
      uci_moves: puzzle.moves,
      fen: puzzle.fen,
    )

    random_puzzles_collection = random_lichess_puzzles_collection
    random_puzzles_collection.user_puzzles << new_user_puzzle
    random_puzzles_collection.save!
    new_user_puzzle
  end

  def next_puzzle_type
    odds_of_random_new = config.odds_of_random_new
    odds_of_random_completed = config.odds_of_random_completed
    random = rand
    if random < odds_of_random_new
      return :random_new
    end

    if random < odds_of_random_new + odds_of_random_completed
      return :random_completed
    end

    :normal
  end

  def next_puzzle(previous_puzzle_id = nil)
    base_query = filtered_user_puzzles.excluding_ids(previous_puzzle_id)
    minimum_puzzles_between = config.minimum_puzzles_between_reviews.to_i
    without_last_n_played = base_query.excluding_last_n_played(self, minimum_puzzles_between)
    due_for_review = base_query.due_for_review

    excluding_recently_seen = without_last_n_played.and(due_for_review)

    case next_puzzle_type
    when :random_new
        existing_random = random_lichess_puzzles_collection
          .user_puzzles
          .excluding_ids(previous_puzzle_id)
          .incomplete
          .left_outer_joins(:puzzle_results)
          .where(puzzle_results: { id: nil })
          .where(lichess_rating: config.puzzle_min_rating..config.puzzle_max_rating)
          .random_record
        return existing_random if existing_random
        puzzle = create_random_lichess_puzzle
        return puzzle if puzzle
      when :random_completed
        random_completed = excluding_recently_seen.completed.random_record
        return random_completed if random_completed
    end

    in_order = {
      'filtered active puzzles without recently seen' => active_puzzles.and(excluding_recently_seen),
      'filtered non-active puzzles not recently seen' => excluding_recently_seen,
      'filtered without last N played' => without_last_n_played,
      'filtered due for review' => due_for_review,
      'filtered user puzzles without previous puzzle' => base_query,
      'any user puzzle without previous puzzle' => user_puzzles.excluding_ids(previous_puzzle_id)
    }

    in_order.each do |description, query|
      puzzle = query.random_record
      unless puzzle
        Rails.logger.info("No puzzle found for `#{description}`")
        next
      end
      Rails.logger.info("Found puzzle for `#{description}`")
      return puzzle
    end

    # Final fallback is to create a new puzzle
    create_random_lichess_puzzle
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
