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

  cancelOffer(id) {
    return api.post(`/offers/${id}/cancel/`).then((r) => r.data);
  },

  publishOffer(id) {
    return api.post(`/offers/${id}/publish/`).then((r) => r.data);
  },

  closeOffer(id) {
    return api.post(`/offers/${id}/close/`).then((r) => r.data);
  },

  awardOffer(id) {
    return api.post(`/offers/${id}/award/`).then((r) => r.data);
  },

  // Submissions — nested under /candidates/offers/{offerId}/submissions/
  getSubmissions(offerId) {
    return api.get(`/candidates/offers/${offerId}/submissions/`).then((r) => r.data);
  },

  createSubmission(offerId, data) {
    return api.post(`/candidates/offers/${offerId}/submissions/`, data).then((r) => r.data);
  },

  // offerId required — backend uses nested route
  scoreSubmission(offerId, submissionId, data) {
    return api
      .patch(`/candidates/offers/${offerId}/submissions/${submissionId}/`, data)
      .then((r) => r.data);
  },

  updateSubmissionStatus(offerId, submissionId, data) {
    return api
      .patch(`/candidates/offers/${offerId}/submissions/${submissionId}/`, data)
      .then((r) => r.data);
  },
};
