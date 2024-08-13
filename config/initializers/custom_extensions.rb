module ActiveRecordRelationExtensions
  def min_max_ids
    min_max = self.select('MIN(id) AS min_id, MAX(id) AS max_id').take
    [min_max.min_id, min_max.max_id]
  end

  def random_record
    min, max = self.min_max_ids
    random_id = rand(min..max)
    self.where(id: random_id..).limit(1).first
  end
end

ActiveSupport.on_load(:active_record) do
  ActiveRecord::Relation.include ActiveRecordRelationExtensions
end
