import api from './api.js';

export const reportsService = {
  exportAllOffers() {
    return api
      .get('/reports/offers/export/', { responseType: 'blob' })
      .then((r) => r.data);
  },

  exportOffer(offerId) {
    return api
      .get(`/reports/offers/${offerId}/export/`, { responseType: 'blob' })
      .then((r) => r.data);
  },
};
