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
end
