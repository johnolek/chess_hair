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
  get 'save-lichess-code', to: 'application#save_lichess_code'
  get 'authenticate-with-lichess', to: 'application#authenticate_with_lichess'

  resource :admin, only: [] do
    get 'user-summary'
  end

  namespace :api do
    namespace :v1 do
      resources :user_puzzles, only: [:create, :show, :index]
      resources :puzzle_results, only: [:create, :show, :index]
      resources :mistakes, only: [:create]
      resource :user, only: [] do
        get 'settings'
        get 'active-puzzles'
        get 'info'
        post 'update_setting'
        get 'get_setting/:key', action: :get_setting
        post 'import-new-puzzle-histories'
        get 'next-puzzle'
        post 'add-favorite/:user_puzzle_id', action: :add_favorite
        delete 'remove-favorite/:user_puzzle_id', action: :remove_favorite
      end
    end
  end

  root "application#puzzles"
end
