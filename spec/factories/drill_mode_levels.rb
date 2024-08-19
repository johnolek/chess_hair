FactoryBot.define do
  factory :drill_mode_level do
    theme { 'mateIn1' }
    rating { Faker::Number.between(from: 500, to: 2000) }
  end
end
