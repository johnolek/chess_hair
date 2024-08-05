FactoryBot.define do
  factory :lichess_puzzle do
    sequence(:puzzle_id) { Faker::Alphanumeric.alphanumeric(number: 5) }
    fen { "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" }
    moves { "e2e4 e7e5 g1f3" }
    game_url { "https://lichess.org/example" }
    rating { Faker::Number.between(from: 500, to: 3500) }
    rating_deviation { Faker::Number.between(from: 20, to: 300) }
    popularity { Faker::Number.between(from: -100, to: 100) }
    nb_plays { Faker::Number.between(from: 0, to: 100_000) }
    themes { "opening" }
    opening_tags { "Sicilian Defense" }
  end
end
