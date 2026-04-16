import axios from 'axios';

const portalApi = axios.create({
  baseURL: 'http://localhost:8000/api/portal',
  headers: { 'Content-Type': 'application/json' },
});

export const getPublicOffers = () =>
  portalApi.get('/offers/').then((r) => r.data);

export const getPublicOffer = (id) =>
  portalApi.get(`/offers/${id}/`).then((r) => r.data);

export const submitProposal = (id, formData) =>
  portalApi.post(`/offers/${id}/submit/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
