module ApplicationHelper
  def body_data_attributes(attributes)
    data_attributes = {}

    attributes.each do |key, value|
      if value.present?
        data_attributes["data-#{key}"] = value
      end
    end

    data_attributes
  end
end
