namespace :user_puzzles do
  desc "Recalculate user puzzles stats"
  task :recalculate => :environment do
    user_puzzles = UserPuzzle.all
    total = user_puzzles.count
    progress = 0

    user_puzzles.each do |user_puzzle|
      user_puzzle.recalculate_stats
      progress += 1
      percent_complete = (progress.to_f / total * 100).round(2)
      print "\rProgress: [#{'=' * (percent_complete / 2).to_i}#{' ' * (50 - (percent_complete / 2).to_i)}] #{percent_complete}%"
    end

    puts "\nRecalculation complete."
  end
end
