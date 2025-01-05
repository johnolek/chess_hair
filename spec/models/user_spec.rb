require 'rails_helper'

RSpec.describe UserPuzzle, type: :model do
  describe 'user config' do
    it 'has expected default values' do
      user = create(:user)
      config = user.config
      settings = config.settings
      expect(settings).to eq Config.default_settings
    end

    it 'includes custom settings' do
      user = create(:user)
      user.config.update!(settings: { 'puzzles.timeGoal' => 20 })
      settings = user.config.settings
      expect(settings['puzzles.timeGoal']).to eq 20
    end
  end

  describe 'active puzzles' do
    it 'calculates active puzzles' do
      user = create(:user)
      expect(user.active_puzzle_ids).to be_empty
      puzzle = create(:user_puzzle, user: user)
      user.recalculate_active_puzzles
      expect(user.active_puzzle_ids.count).to be 1
      expect(user.active_puzzle_ids.first).to eq puzzle.id
    end

    it 'can not include completed puzzles' do
      user = create(:user)
      puzzle = create(:user_puzzle, user: user, complete: true)
      puzzle2 = create(:user_puzzle, user: user, complete: false)
      user.recalculate_active_puzzles
      expect(user.active_puzzle_ids.count).to be 1
      expect(user.active_puzzle_ids.first).to eq puzzle2.id
    end
  end

  describe '#destroy' do
    it 'destroys associated records' do
      user = create(:user)
      user.destroy
    end
  end
end
