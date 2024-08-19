# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2024_08_19_191920) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "collections", force: :cascade do |t|
    t.string "name", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_collections_on_user_id"
  end

  create_table "collections_user_puzzles", id: false, force: :cascade do |t|
    t.bigint "collection_id", null: false
    t.bigint "user_puzzle_id", null: false
    t.index ["collection_id"], name: "index_collections_user_puzzles_on_collection_id"
    t.index ["user_puzzle_id"], name: "index_collections_user_puzzles_on_user_puzzle_id"
  end

  create_table "configs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.json "settings", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_configs_on_user_id"
  end

  create_table "drill_mode_levels", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "theme", null: false
    t.integer "rating"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_drill_mode_levels_on_user_id"
  end

  create_table "favorites_collection_for_existing_users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "lichess_puzzles", force: :cascade do |t|
    t.string "puzzle_id"
    t.string "fen"
    t.text "moves"
    t.text "game_url"
    t.integer "rating"
    t.integer "rating_deviation"
    t.integer "popularity"
    t.integer "nb_plays"
    t.string "themes"
    t.string "opening_tags"
    t.index ["fen"], name: "index_lichess_puzzles_on_fen"
    t.index ["moves"], name: "index_lichess_puzzles_on_moves"
    t.index ["nb_plays"], name: "index_lichess_puzzles_on_nb_plays"
    t.index ["opening_tags"], name: "index_lichess_puzzles_on_opening_tags"
    t.index ["popularity"], name: "index_lichess_puzzles_on_popularity"
    t.index ["puzzle_id"], name: "index_lichess_puzzles_on_puzzle_id", unique: true
    t.index ["rating"], name: "index_lichess_puzzles_on_rating"
    t.index ["rating_deviation"], name: "index_lichess_puzzles_on_rating_deviation"
    t.index ["themes"], name: "index_lichess_puzzles_on_themes"
  end

  create_table "mistakes", force: :cascade do |t|
    t.bigint "user_puzzle_id", null: false
    t.integer "move_index", null: false
    t.string "uci_move", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_puzzle_id"], name: "index_mistakes_on_user_puzzle_id"
  end

  create_table "puzzle_results", force: :cascade do |t|
    t.string "lichess_puzzle_id"
    t.boolean "made_mistake", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "duration", null: false
    t.bigint "user_puzzle_id", null: false
    t.index ["created_at"], name: "index_puzzle_results_on_created_at"
    t.index ["made_mistake"], name: "index_puzzle_results_on_made_mistake"
  end

  create_table "site_settings", force: :cascade do |t|
    t.string "name", null: false
    t.json "value", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "user_puzzle_histories", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "puzzle_id", null: false
    t.bigint "played_at", null: false
    t.boolean "win", null: false
    t.integer "rating", null: false
    t.integer "plays", null: false
    t.text "solution", null: false
    t.text "fen", null: false
    t.string "last_move", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "themes", null: false
    t.index ["created_at"], name: "index_user_puzzle_histories_on_created_at"
    t.index ["puzzle_id"], name: "index_user_puzzle_histories_on_puzzle_id"
    t.index ["rating"], name: "index_user_puzzle_histories_on_rating"
    t.index ["themes"], name: "index_user_puzzle_histories_on_themes"
    t.index ["user_id", "puzzle_id", "played_at"], name: "idx_on_user_id_puzzle_id_played_at_b3473fc27c", unique: true
    t.index ["user_id", "puzzle_id"], name: "index_user_puzzle_histories_on_user_id_and_puzzle_id"
    t.index ["user_id"], name: "index_user_puzzle_histories_on_user_id"
    t.index ["win"], name: "index_user_puzzle_histories_on_win"
  end

  create_table "user_puzzles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "lichess_puzzle_id"
    t.integer "lichess_rating"
    t.string "fen", null: false
    t.string "uci_moves", null: false
    t.float "average_solve_time"
    t.integer "solve_streak", default: 0, null: false
    t.integer "total_fails", default: 0, null: false
    t.integer "total_solves", default: 0, null: false
    t.boolean "complete", default: false, null: false
    t.datetime "last_played"
    t.datetime "next_review"
    t.index ["last_played"], name: "index_user_puzzles_on_last_played"
    t.index ["next_review"], name: "index_user_puzzles_on_next_review"
    t.index ["user_id"], name: "index_user_puzzles_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "lichess_api_token"
    t.text "active_puzzle_ids"
    t.string "lichess_code"
    t.string "lichess_code_verifier"
    t.boolean "admin", default: false
    t.json "data", default: {}
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "configs", "users"
  add_foreign_key "drill_mode_levels", "users"
  add_foreign_key "mistakes", "user_puzzles"
  add_foreign_key "puzzle_results", "user_puzzles"
  add_foreign_key "user_puzzle_histories", "users"
  add_foreign_key "user_puzzles", "users"
end
