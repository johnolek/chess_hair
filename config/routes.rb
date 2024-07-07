Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html
  get "up" => "rails/health#show", as: :rails_health_check

  get 'knight_moves', to: 'application#knight_moves'
  get 'knight-moves', to: 'application#knight_moves'

  get 'daily-games', to: 'application#daily_games'
  get 'notation-trainer', to: 'application#notation_trainer'
  get 'puzzles', to: 'application#puzzles'
  get 'config', to: 'application#global_config'

  namespace :api do
    namespace :v1 do
      resources :user_puzzles, only: [:create, :show, :index]
    end
  end

  root "application#knight_moves"
end
