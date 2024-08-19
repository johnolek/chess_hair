require 'rails_helper'

RSpec.describe DrillModeLevel, type: :model do
  describe 'validations' do
    it 'should only allow a single level (theme) per user' do
      user = create(:user)
      theme = 'some_non_default_theme_to_avoid_errors'
      create(:drill_mode_level, user: user, theme: theme)
      expect { create(:drill_mode_level, user: user, theme: theme) }.to raise_error(ActiveRecord::RecordInvalid)
    end

    it { should validate_presence_of(:theme) }
  end

  describe 'associations' do
    it { should belong_to(:user) }
  end
end
