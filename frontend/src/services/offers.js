import api from './api.js';

export const offersService = {
  getOffers(params) {
    return api.get('/offers/', { params }).then((r) => r.data);
  },

  getOffer(id) {
    return api.get(`/offers/${id}/`).then((r) => r.data);
  },

  createOffer(data) {
    return api.post('/offers/', data).then((r) => r.data);
  },

  updateOffer(id, data) {
    return api.patch(`/offers/${id}/`, data).then((r) => r.data);
  },

  // data: { status, outcome_reason?, winner_name?, winning_amount?, our_rank? }
  transition(id, data) {
    return api.post(`/offers/${id}/transition/`, data).then((r) => r.data);
  },
};
