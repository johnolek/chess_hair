# lib/tasks/import_lichess_puzzles.rake
require 'csv'

namespace :lichess do
  desc "Import puzzles from a CSV file"
  task :import_puzzles, [:file_path] => :environment do |t, args|
    file_path = args[:file_path] || '/Users/johnoleksowicz/Downloads/lichess_db_puzzle.csv'
    raise "File not found: #{file_path}" unless File.exist?(file_path)

    batch_size = 100_000

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
        }
      end

      LichessPuzzle.insert_all(puzzles_data)
      puts "Inserted #{batch_size} puzzles"
    end

    # Assuming Tag and OpeningTag models have a 'name' attribute that is unique
    # Find existing tags/opening tags or create new ones in bulk
    # This step requires a method to efficiently find or create tags and opening tags in bulk,
    # which might involve custom SQL queries or using existing gems that support bulk operations.

    puts "Import completed!"
  end

  task :import_puzzle_tags, [:file_path] => :environment do |t, args|
    file_path = args[:file_path] || '/Users/johnoleksowicz/Downloads/lichess_db_puzzle.csv'
    raise "File not found: #{file_path}" unless File.exist?(file_path)
    CSV.foreach(file_path, headers: true).with_index do |row, index|
      puzzle = LichessPuzzle.find_by(puzzle_id: row['PuzzleId'])
      if row['Themes']
        themes = row['Themes'].split(' ')
        themes.each do |name|
          tag = Tag.find_or_create_by(name: name)
          puzzle.tags << tag unless puzzle.tags.include?(tag)
        end
      end
      if row['OpeningTags']
        tags = row['OpeningTags'].split(' ')
        tags.each do |name|
          tag = OpeningTag.find_or_create_by(name: name)
          puzzle.opening_tags << tag unless puzzle.opening_tags.include?(tag)
        end
      end
      puzzle.save!
      puts puzzle.id
    end
  end
end
