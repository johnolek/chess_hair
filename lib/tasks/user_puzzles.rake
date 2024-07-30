# lib/tasks/import_lichess_puzzles.rake

namespace :user_puzzles do
  desc "Recalculate user puzzles stats"
  task :recalculate => :environment do
    UserPuzzle.all.each do |user_puzzle|
      user_puzzle.recalculate_stats
    end
  end
end
