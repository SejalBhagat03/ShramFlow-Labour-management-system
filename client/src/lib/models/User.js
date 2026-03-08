/**
 * User Model
 * Represents a user in the system with their role and profile.
 */
export class User {
    /**
     * @param {Object} data
     * @param {string} data.id - The unique User ID
     * @param {string} data.email - User email
     * @param {string} data.name - User full name
     * @param {'supervisor' | 'labour' | null} data.role - User role
     * @param {string} [data.phone] - User phone number
     * @param {string} [data.avatar_url] - URL to user avatar
     * @param {string} [data.organization_id] - ID of the organization the user belongs to
     */
    constructor({ id, email, name, role, phone, avatar_url, organization_id }) {
        this.id = id;
        this.email = email;
        this.name = name || 'User';
        this.role = role;
        this.phone = phone;
        this.avatar_url = avatar_url;
        this.organization_id = organization_id;
    }

    /**
     * specific helper to check if user is a supervisor
     * @returns {boolean}
     */
    isSupervisor() {
        return this.role === 'supervisor';
    }

    /**
     * specific helper to check if user is a labourer
     * @returns {boolean}
     */
    isLabour() {
        return this.role === 'labour';
    }
}
