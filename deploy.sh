#!/bin/bash
export RAILS_ENV=production
export NODE_ENV=production
git pull
bundle install
rails db:migrate
npm ci
npm run build
npm run prod-styles
rails assets:clobber
rails assets:precompile
touch tmp/restart.txt
