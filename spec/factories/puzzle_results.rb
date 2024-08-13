FactoryBot.define do
  factory :puzzle_result do
    association :user_puzzle
    lichess_puzzle_id { Faker::Alphanumeric.alphanumeric(number: 10) }
    made_mistake { false }
    duration { Faker::Number.between(from: 4000, to: 120_000) }
    created_at { Time.current }
    updated_at { Time.current }

    trait :correct do
      made_mistake { false }
    end

    trait :incorrect do
      made_mistake { true }
    end
  end
end
