# Pin npm packages by running ./bin/importmap

pin "application"
pin_all_from "app/javascript/controllers", under: "controllers"
pin_all_from 'app/javascript/src', under: 'src', to: 'src'
pin_all_from 'app/javascript/dist', under: 'dist', to: 'dist'
pin 'daily_games', to: 'app/javascript/dist/daily_games.js'
pin "lichess-pgn-viewer", to: 'lichess-pgn-viewer.min.js'
pin 'bootstrap', to: 'bootstrap.bundle.min.js'
pin 'chessground', to: 'chessground/chessground.js'
