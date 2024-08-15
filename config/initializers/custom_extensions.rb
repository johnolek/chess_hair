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
    random_id = rand(min..max)
    self.where(id: random_id..).limit(1).first
  end
end

ActiveSupport.on_load(:active_record) do
  ActiveRecord::Relation.include ActiveRecordRelationExtensions
end
