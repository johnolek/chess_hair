Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html
  get "up" => "rails/health#show", as: :rails_health_check
  get "env", to: "application#env"

  get 'knight_moves', to: 'application#knight_moves'
  get 'knight-moves', to: 'application#knight_moves'

  get 'daily-games', to: 'application#daily_games'
  get 'notation-trainer', to: 'application#notation_trainer'
  get 'puzzles', to: 'application#puzzles'
  get 'config', to: 'application#global_config'

  namespace :api do
    namespace :v1 do
      resources :user_puzzles, only: [:create, :show, :index]
      resources :puzzle_results, only: [:create, :show, :index]
      resources :users, only: [] do
        get 'settings', on: :collection
        post 'update_setting', to: 'users#update_setting', on: :collection
        get 'get_setting/:key', to: 'users#get_setting', on: :collection
      end
    end
  end

  root "application#knight_moves"
end
