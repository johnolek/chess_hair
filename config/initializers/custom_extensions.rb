module ActiveRecordRelationExtensions
  def min_max_ids
    table_name = self.klass.table_name
    primary_key = self.klass.primary_key
    min_max = self.select("MIN(#{table_name}.#{primary_key}) AS min_id, MAX(#{table_name}.#{primary_key}) AS max_id").take
    [min_max&.min_id, min_max&.max_id]
  end

  def random_record
    total_records = self.count
    return nil unless total_records > 0
    random_offset = rand(total_records)
    self.offset(random_offset).limit(1).take
  end
end

ActiveSupport.on_load(:active_record) do
  ActiveRecord::Relation.include ActiveRecordRelationExtensions
end
