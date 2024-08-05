FactoryBot.define do
  factory :user_puzzle do
    association :user
    lichess_puzzle_id { Faker::Alphanumeric.alphanumeric(number: 10) }
    lichess_rating { Faker::Number.between(from: 500, to: 3500) }
    fen { Faker::Lorem.characters(number: 20) }
    uci_moves { Faker::Lorem.characters(number: 20) }
    average_solve_time { Faker::Number.decimal(l_digits: 2) }
    solve_streak { Faker::Number.between(from: 0, to: 5) }
    total_fails { Faker::Number.between(from: 0, to: 10) }
    total_solves { Faker::Number.between(from: 0, to: 10) }
    complete { false }
    last_played { Faker::Time.backward(days: 14) }
    next_review { Faker::Time.forward(days: 14) }

    trait :with_puzzle_results do
      transient do
        puzzle_results_count { 3 }
      end

      after(:create) do |user_puzzle, evaluator|
        create_list(:puzzle_result, evaluator.puzzle_results_count, user: user_puzzle.user, puzzle_id: user_puzzle.lichess_puzzle_id)
        user_puzzle.recalculate_stats
      end
    end
  end
end
