/**
 * WorkEntry Model
 * Represents a daily work entry.
 */
export class WorkEntry {
    /**
     * @param {Object} data
     * @param {string} data.id
     * @param {string} data.labourer_id
     * @param {string} data.date
     * @param {number} data.meters
     * @param {number} data.amount
     * @param {'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'} data.status
     * @param {string} [data.description]
     * @param {string} [data.task_type]
     * @param {string} [data.rejected_reason]
     * @param {string} [data.approved_by]
     * @param {string} [data.approved_at]
     * @param {string} [data.photo_url]
     * @param {string} [data.before_photo_url]
     * @param {string} [data.after_photo_url]
     */
    constructor(data) {
        this.id = data.id;
        this.labourer_id = data.labourer_id;
        this.date = data.date;
        this.meters = Number(data.meters) || 0;
        this.amount = Number(data.amount) || 0;
        this.status = data.status || 'submitted';
        this.description = data.description;
        this.task_type = data.task_type || 'General';
        this.rejected_reason = data.rejected_reason;
        this.approved_by = data.approved_by;
        this.approved_at = data.approved_at;
        this.latitude = data.latitude;
        this.longitude = data.longitude;
        this.wage_amount = Number(data.wage_amount) || 0;
        this.photo_url = data.photo_url;
        this.before_photo_url = data.before_photo_url;
        this.after_photo_url = data.after_photo_url;
    }
}
