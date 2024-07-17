class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  has_many :user_puzzles
  has_many :puzzle_results
  has_one :config
  has_many :user_puzzle_histories

  serialize :active_puzzle_ids, coder: YAML

  def config
    super || build_config
  end

  def recalculate_active_puzzles
    count = config.puzzle_batch_size

    histories_query = user_puzzle_histories.solved_incorrectly

    if config.puzzle_min_rating
      histories_query = histories_query.minimum_rating(config.puzzle_min_rating)
    end

    if config.puzzle_max_rating
      histories_query = histories_query.maximum_rating(config.puzzle_max_rating)
    end

    unsolved = histories_query.all.filter { |history| !history.complete? }
    puzzle_ids = unsolved.sample(count).map(&:puzzle_id)
    self.active_puzzle_ids = puzzle_ids
    save!
  end

  def add_puzzle_id(puzzle_id)
    self.active_puzzle_ids << puzzle_id unless self.active_puzzle_ids.include?(puzzle_id)
    save
  end

  def remove_puzzle_id(puzzle_id)
    self.active_puzzle_ids.delete(puzzle_id)
    save
  end

  def has_puzzle_id?(puzzle_id)
    self.active_puzzle_ids.include?(puzzle_id)
  end

  def active_puzzle_ids
    super || []
  end
end
