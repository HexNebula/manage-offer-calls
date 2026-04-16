import api from './api.js';

export const candidatesService = {
  getCandidates(params) {
    return api.get('/candidates/', { params }).then((r) => r.data);
  },

  getCandidate(id) {
    return api.get(`/candidates/${id}/`).then((r) => r.data);
  },

  createCandidate(data) {
    return api.post('/candidates/', data).then((r) => r.data);
  },

  updateCandidate(id, data) {
    return api.patch(`/candidates/${id}/`, data).then((r) => r.data);
  },

  deleteCandidate(id) {
    return api.delete(`/candidates/${id}/`).then((r) => r.data);
  },
};
