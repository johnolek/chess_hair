require 'net/http'
require 'uri'

module LichessApi
  def self.fetch_puzzle_activity(token, max = nil, before = nil)
    Rails.logger.info("Fetching puzzles with max: #{max}, before: #{before}")
    uri = URI("https://lichess.org/api/puzzle/activity")
    params = { max: max, before: before }.reject { |_k, v| v.nil? }
    uri.query = URI.encode_www_form(params)
    request = Net::HTTP::Get.new(uri)
    request['Accept'] = 'application/x-ndjson'
    request['User-Agent'] = 'chess.hair'
    request["Authorization"] = "Bearer #{token}"
    puzzles = []

    NdJsonStreamer.stream_from_request(request) do |puzzle_json|
      puzzles << puzzle_json
    end

    puzzles
  end
end
