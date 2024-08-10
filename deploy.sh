#!/bin/bash

set -e

export RAILS_ENV=production

git pull

npm install
npm run build
npm run prod-styles

bundle install

rails db:migrate
rails assets:clobber
rails assets:precompile
rails site:update_site_version

touch tmp/restart.txt
