import api from './api.js';

export const documentsService = {
  uploadDocument(formData) {
    return api
      .post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  downloadDocument(id) {
    return api
      .get(`/documents/${id}/download/`, { responseType: 'blob' })
      .then((r) => r.data);
  },

  deleteDocument(id) {
    return api.delete(`/documents/${id}/delete/`).then((r) => r.data);
  },

  getOfferDocuments(offerId) {
    return api.get('/documents/', { params: { offer_call: offerId } }).then((r) => r.data);
  },
};
