FactoryBot.define do
  factory :collection do
    association :user
    name { Faker::Lorem.word }
  end
end
