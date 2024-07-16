require 'net/http'
require 'uri'

module LichessApi
  def self.fetch_puzzle_activity(token, max = 200, before = nil)
    uri = URI("https://lichess.org/api/puzzle/activity?max=#{max}#{before ? "&before=#{before}" : ''}")
    request = Net::HTTP::Get.new(uri)
    request['Accept'] = 'application/x-ndjson'
    request['User-Agent'] = 'chess.hair'
    request["Authorization"] = "Bearer #{token}"

    NdJsonStreamer.stream_from_request(request) do |puzzle_json|
      yield puzzle_json
    end
  end
end
