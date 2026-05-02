/**
 * @class WorkEntry
 * @description Domain model for a work entry log.
 */
export class WorkEntry {
  constructor(data) {
    this.id = data.id;
    this.labourer_id = data.labourer_id;
    this.project_id = data.project_id;
    this.date = data.date;
    this.meters = data.meters || data.claimed_meters || 0;
    this.rate_per_meter = data.rate_per_meter || data.rate_applied || 0;
    this.amount = data.amount || data.total_amount || (this.meters * this.rate_per_meter) || 0;
    this.task_type = data.task_type || 'General';
    this.status = data.status || 'pending';
    this.photo_url = data.photo_url || data.photo_evidence_url;
    this.photo_url_after = data.photo_url_after;
    this.location_name = data.location_name;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.is_deleted = data.is_deleted || false;
    this.labourer = data.labourer;
    this.project = data.project;
  }

  /**
   * Helper to get labourer name from joined data
   */
  getLabourerName() {
    return this.labourer?.full_name || this.labourer?.name || 'Unknown';
  }

  /**
   * Helper to get project name from joined data
   */
  getProjectName() {
    return this.project?.name || 'Unknown';
  }

  get formattedDate() {
    return new Date(this.date).toLocaleDateString();
  }

  get isPending() {
    return this.status === 'pending';
  }

  get isApproved() {
    return this.status === 'approved';
  }

  get isRejected() {
    return this.status === 'rejected';
  }

  get isDisputed() {
    return this.status === 'disputed';
  }
}

export default WorkEntry;
