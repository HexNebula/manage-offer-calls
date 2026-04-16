import api from './api.js';

export const notificationsService = {
  getNotifications(params) {
    return api.get('/notifications/', { params }).then((r) => r.data);
  },

  getUnread() {
    return api.get('/notifications/unread-count/').then((r) => r.data);
  },

  markRead(id) {
    return api.post(`/notifications/${id}/read/`).then((r) => r.data);
  },

  markAllRead() {
    return api.post('/notifications/mark-all-read/').then((r) => r.data);
  },
};
