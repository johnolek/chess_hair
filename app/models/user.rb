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

  def grouped_puzzle_results
    @grouped_puzzle_results ||= puzzle_results.group_by(&:puzzle_id)
  end

  def recalculate_active_puzzles
    remove_complete_from_active

    count = config.puzzle_batch_size

    if active_puzzle_ids.count > count
      self.active_puzzle_ids = active_puzzle_ids.slice(0, count)
      save!
      return
    end

    return if active_puzzle_ids.count == count

    # Need to add more
    histories_query = user_puzzle_histories.solved_incorrectly

    if config.puzzle_min_rating
      histories_query = histories_query.minimum_rating(config.puzzle_min_rating)
    end

    if config.puzzle_max_rating
      histories_query = histories_query.maximum_rating(config.puzzle_max_rating)
    end

    unsolved = histories_query.all.filter { |history| !history.complete? }.shuffle

    additional_required = count - active_puzzle_ids.count

    puzzle_ids = unsolved.sample(additional_required).map(&:puzzle_id)
    puzzle_ids.each do |puzzle_id|
      add_puzzle_id(puzzle_id)
    end
  end

  def remove_complete_from_active
    return unless active_puzzle_ids.count > 0
    histories = user_puzzle_histories.where(puzzle_id: active_puzzle_ids)
    complete = histories.all.filter { | history| history.complete? }
    complete.each do |history|
      remove_puzzle_id(history.puzzle_id)
    end
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
