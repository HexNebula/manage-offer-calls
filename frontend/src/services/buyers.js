import api from './api.js';

export const buyersService = {
  getBuyers(params) {
    return api.get('/buyers/', { params }).then((r) => r.data);
  },

  createBuyer(data) {
    return api.post('/buyers/', data).then((r) => r.data);
  },

  updateBuyer(id, data) {
    return api.patch(`/buyers/${id}/`, data).then((r) => r.data);
  },

  deleteBuyer(id) {
    return api.delete(`/buyers/${id}/`).then((r) => r.data);
  },
};
