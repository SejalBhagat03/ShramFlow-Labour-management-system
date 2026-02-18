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
     * @param {'pending' | 'approved' | 'rejected' | 'flagged'} data.status
     * @param {string} [data.description]
     * @param {string} [data.task_type]
     */
    constructor(data) {
        this.id = data.id;
        this.labourer_id = data.labourer_id;
        this.date = data.date;
        this.meters = Number(data.meters) || 0;
        this.amount = Number(data.amount) || 0;
        this.status = data.status || 'pending';
        this.description = data.description;
        this.task_type = data.task_type || 'General';
        this.latitude = data.latitude;
        this.longitude = data.longitude;
        this.wage_amount = Number(data.wage_amount) || 0;
    }
}
