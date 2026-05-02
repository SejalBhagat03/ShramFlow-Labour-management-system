/**
 * @class User
 * @description Domain model for a ShramFlow user.
 */
export class User {
  constructor({ 
    id, 
    email, 
    name, 
    role = 'labour', 
    phone = '', 
    avatar_url = '', 
    organization_id = null 
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role;
    this.phone = phone;
    this.avatar_url = avatar_url;
    this.organization_id = organization_id;
  }

  /**
   * Check if user has administrative privileges
   */
  get isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Check if user is a supervisor
   */
  get isSupervisor() {
    return this.role === 'supervisor';
  }

  /**
   * Check if user is a labourer
   */
  get isLabour() {
    return this.role === 'labour';
  }

  /**
   * Returns initials for avatar fallback
   */
  get initials() {
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
}

export default User;
