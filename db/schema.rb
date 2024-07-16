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

ActiveRecord::Schema[7.1].define(version: 2024_07_16_213536) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "configs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.json "settings", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_configs_on_user_id"
  end

  create_table "lichess_puzzle_opening_tags", force: :cascade do |t|
    t.bigint "lichess_puzzle_id", null: false
    t.bigint "opening_tag_id", null: false
    t.index ["lichess_puzzle_id"], name: "index_lichess_puzzle_opening_tags_on_lichess_puzzle_id"
    t.index ["opening_tag_id"], name: "index_lichess_puzzle_opening_tags_on_opening_tag_id"
  end

  create_table "lichess_puzzle_tags", force: :cascade do |t|
    t.bigint "lichess_puzzle_id", null: false
    t.bigint "tag_id", null: false
    t.index ["lichess_puzzle_id"], name: "index_lichess_puzzle_tags_on_lichess_puzzle_id"
    t.index ["tag_id"], name: "index_lichess_puzzle_tags_on_tag_id"
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
    t.index ["puzzle_id"], name: "index_lichess_puzzles_on_puzzle_id", unique: true
  end

  create_table "opening_tags", force: :cascade do |t|
    t.string "name"
    t.index ["name"], name: "index_opening_tags_on_name", unique: true
  end

  create_table "puzzle_results", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "puzzle_id", null: false
    t.boolean "skipped", default: false, null: false
    t.boolean "made_mistake", default: false, null: false
    t.bigint "seen_at", null: false
    t.bigint "done_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_puzzle_results_on_user_id"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name"
    t.index ["name"], name: "index_tags_on_name", unique: true
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
    t.index ["user_id", "puzzle_id", "played_at"], name: "idx_on_user_id_puzzle_id_played_at_b3473fc27c", unique: true
    t.index ["user_id"], name: "index_user_puzzle_histories_on_user_id"
  end

  create_table "user_puzzles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "puzzle_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "configs", "users"
  add_foreign_key "lichess_puzzle_opening_tags", "lichess_puzzles"
  add_foreign_key "lichess_puzzle_opening_tags", "opening_tags"
  add_foreign_key "lichess_puzzle_tags", "lichess_puzzles"
  add_foreign_key "lichess_puzzle_tags", "tags"
  add_foreign_key "puzzle_results", "users"
  add_foreign_key "user_puzzle_histories", "users"
  add_foreign_key "user_puzzles", "users"
end
