module NdJsonStreamer
  require 'net/http'
  require 'uri'
  require 'json'

  # Streams ND-JSON from a given HTTP request object and yields each parsed object to the provided block.
  # @param [Net::HTTP::Request] request The fully configured HTTP request object.
  # @yield [Hash] Yields each parsed JSON object to the block.
  def self.stream_from_request(request, &block)
    uri = request.uri
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      http.request(request) do |response|
        buffer = ''
        response.read_body do |chunk|
          buffer += chunk
          loop do
            line = buffer.slice!(/.+\n/)&.chomp
            break unless line
            yield line
          end
        end
      end
    end
  end
end
