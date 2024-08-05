FactoryBot.define do
  factory :config do
    association :user
    settings { {} }
  end
end
