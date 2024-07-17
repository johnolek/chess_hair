class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  scope :random_order, -> { order(Arel.sql('RANDOM()')) }
end
