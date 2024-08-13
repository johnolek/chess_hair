class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  scope :random_order, -> { order(Arel.sql('RANDOM()')) }

  class << self
    def random_item_from_relation(relation)
      min = relation.minimum(:id)
      max = relation.maximum(:id)
      if !min || !max
        return relation.random_order.first
      end

      random = rand(min..max)
      relation.where(id: random..).limit(1).first
    end
  end
end
