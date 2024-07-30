FactoryBot.define do
  factory :user do
    email { Faker::Internet.email }
    password { "password" }
    password_confirmation { "password" }
    lichess_api_token { Faker::Alphanumeric.alphanumeric(number: 20) }
    active_puzzle_ids { [] }
    lichess_code { Faker::Alphanumeric.alphanumeric(number: 10) }
    lichess_code_verifier { Faker::Alphanumeric.alphanumeric(number: 10) }
    admin { false }
    data { {} }
  end

  factory :collection do
    association :user
    name { Faker::Lorem.word }
  end

  factory :user_puzzle do
    association :user
    lichess_rating { Faker::Number.between(from: 500, to: 3500) }
    complete { false }
  end
end
