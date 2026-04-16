import api from './api.js';

export const authService = {
  getMe() {
    return api.get('/auth/me/').then((r) => r.data);
  },

  updateMe(data) {
    return api.patch('/auth/me/', data).then((r) => r.data);
  },

  // Admin user management
  getUsers() {
    return api.get('/auth/users/').then((r) => r.data);
  },

  createUser(data) {
    return api.post('/auth/users/', data).then((r) => r.data);
  },

  updateUser(id, data) {
    return api.patch(`/auth/users/${id}/`, data).then((r) => r.data);
  },

  getAuditLog(params) {
    return api.get('/audit/logs/', { params }).then((r) => r.data);
  },
};
