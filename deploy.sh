#!/bin/bash

set -e

export RAILS_ENV=production
export NODE_ENV=production

git pull

npm install
npm run build
npm run prod-styles

bundle install

rails db:migrate
rails assets:clobber
rails assets:precompile
touch tmp/restart.txt
