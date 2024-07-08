#!/bin/bash

git pull
bundle install
rails db:migrate
rails assets:clobber
rails assets:precompile
touch tmp/restart.txt
