module ActiveRecordRelationExtensions
  def min_max_ids
    table_name = self.klass.table_name
    primary_key = self.klass.primary_key
    min_max = self.select("MIN(#{table_name}.#{primary_key}) AS min_id, MAX(#{table_name}.#{primary_key}) AS max_id").take
    [min_max&.min_id, min_max&.max_id]
  end

  def random_record
    min, max = self.min_max_ids
    return nil if min.nil? || max.nil?
    table_name = self.klass.table_name
    primary_key = self.klass.primary_key
    full_primary_key = "#{table_name}.#{primary_key}"
    random_id = rand(min..max)
    self.where("#{full_primary_key}" => random_id..).order("#{full_primary_key}" => :asc).limit(1).first
  end
end

ActiveSupport.on_load(:active_record) do
  ActiveRecord::Relation.include ActiveRecordRelationExtensions
end
