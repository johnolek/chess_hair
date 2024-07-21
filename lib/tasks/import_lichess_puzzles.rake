# lib/tasks/import_lichess_puzzles.rake
require 'csv'

namespace :lichess do
  desc "Import puzzles from a CSV file"
  task :import_puzzles, [:file_path] => :environment do |t, args|
    file_path = args[:file_path] || '/Users/johnoleksowicz/Downloads/lichess_db_puzzle.csv'
    raise "File not found: #{file_path}" unless File.exist?(file_path)

    batch_size = 10_000

    CSV.open(file_path, headers: true).each_slice(batch_size) do |rows|
      puzzles_data = []
      rows.each do |row|
        puzzles_data << {
          puzzle_id: row['PuzzleId'],
          fen: row['FEN'],
          moves: row['Moves'],
          rating: row['Rating'],
          rating_deviation: row['RatingDeviation'],
          game_url: row['GameURL'],
          popularity: row['Popularity'],
          nb_plays: row['NbPlays'],
          themes: row['Themes'],
          opening_tags: row['OpeningTags'],
        }
      end

      LichessPuzzle.insert_all(puzzles_data)
      puts "Inserted #{batch_size} puzzles"
    end

    puts "Import completed!"
  end
end
