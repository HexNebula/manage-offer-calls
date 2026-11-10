import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Upload, Download, Trash2, FileText, Lock, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { offersService } from '../../services/offers.js';
import { documentsService } from '../../services/documents.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import OfferStatusBadge, { CATEGORY_LABELS } from '../../components/offers/OfferStatusBadge.jsx';

// Mirrors OfferCall.VALID_TRANSITIONS on the backend, which stays the source of truth.
// `form`: null = one click, 'reason' = asks why, 'result' = asks for the buyer's result.
const ACTIONS = {
  DETECTED: [
    { to: 'PREPARING', label: 'Go : préparer la réponse', variant: 'success' },
    { to: 'NO_GO', label: 'No-Go', variant: 'secondary', form: 'reason', required: true },
  ],
  PREPARING: [{ to: 'REVIEW', label: 'Envoyer en validation', variant: 'primary' }],
  REVIEW: [
    { to: 'PREPARING', label: 'Renvoyer en préparation', variant: 'secondary' },
    { to: 'SUBMITTED', label: 'Marquer comme déposée', variant: 'warning' },
  ],
  SUBMITTED: [
    { to: 'WON', label: 'Gagné', variant: 'success', form: 'result' },
    { to: 'LOST', label: 'Perdu', variant: 'danger', form: 'result', required: true },
  ],
};
const CANCELLABLE = ['DETECTED', 'PREPARING', 'REVIEW', 'SUBMITTED'];
const FINAL = ['WON', 'LOST', 'NO_GO', 'CANCELLED'];

const DOC_CATEGORIES = {
  DAO: { label: "Dossier d'AO (acheteur)", variant: 'gray' },
  ADMINISTRATIVE: { label: 'Administratif', variant: 'blue' },
  TECHNICAL: { label: 'Technique', variant: 'purple' },
  FINANCIAL: { label: 'Financier', variant: 'orange' },
};

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(value) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value);
}

function apiError(err) {
  const data = err?.response?.data;
  if (!data) return err ? 'Une erreur est survenue.' : null;
  return data.error || data.detail || Object.values(data).flat().join(' ');
}

function Field({ label, children, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-sm text-gray-900">{children || '—'}</div>
    </div>
  );
}

function TransitionModal({ offer, action, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm();
  const mutation = useMutation({
    mutationFn: (data) => offersService.transition(offer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', offer.id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onClose();
    },
  });

  const submit = (data) => {
    const payload = { status: action.to };
    Object.entries(data).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
    mutation.mutate(payload);
  };

  return (
    <Modal isOpen onClose={onClose} title={action.label}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {mutation.error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {apiError(mutation.error)}
          </div>
        )}
        {action.form === 'result' && (
          <>
            <Input label="Attributaire" placeholder="Nom de la société retenue" {...register('winner_name')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Montant retenu (MAD)" type="number" min="0" step="0.01" {...register('winning_amount')} />
              <Input label="Rang de N+ONE" type="number" min="1" {...register('our_rank')} />
            </div>
          </>
        )}
        {action.form && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif {action.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              required={action.required}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('outcome_reason')}
            />
          </div>
        )}
        {!action.form && (
          <p className="text-sm text-gray-600">
            Confirmer le passage de <strong>{offer.reference_number}</strong> au statut suivant ?
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant={action.variant} isLoading={mutation.isPending}>Confirmer</Button>
        </div>
      </form>
    </Modal>
  );
}

function UploadModal({ offerId, canSeeFinancial, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch } = useForm({ defaultValues: { category: 'TECHNICAL' } });
  const category = watch('category');
  const mutation = useMutation({
    mutationFn: documentsService.uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-documents', offerId] });
      onClose();
    },
  });

  const categoryOptions = Object.entries(DOC_CATEGORIES)
    .filter(([value]) => value !== 'FINANCIAL' || canSeeFinancial)
    .map(([value, { label }]) => ({ value, label }));

  const submit = (data) => {
    const formData = new FormData();
    formData.append('file', data.file[0]);
    formData.append('offer_call', offerId);
    formData.append('category', data.category);
    formData.append('is_sensitive', data.is_sensitive ? 'true' : 'false');
    if (data.expires_at) formData.append('expires_at', data.expires_at);
    mutation.mutate(formData);
  };

  return (
    <Modal isOpen onClose={onClose} title="Ajouter une pièce">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {mutation.error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {apiError(mutation.error)}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fichier (PDF, DOCX, XLSX) <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx"
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-brand-navy hover:file:bg-orange-100"
            {...register('file', { required: true })}
          />
        </div>
        <Select label="Catégorie" options={categoryOptions} {...register('category')} />
        <Input
          label="Date d'expiration"
          type="date"
          helperText="Pour les attestations (fiscale, CNSS...) : une alerte est envoyée 15 jours avant."
          {...register('expires_at')}
        />
        {category === 'FINANCIAL' ? (
          <p className="flex items-center gap-2 text-sm text-orange-600">
            <Lock size={14} /> Les pièces financières sont toujours chiffrées (AES-256-GCM).
          </p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300" {...register('is_sensitive')} />
            Chiffrer ce document (données personnelles : CV, CIN...)
          </label>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" isLoading={mutation.isPending}>Téléverser</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersService.getOffer(id),
  });

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canUpload = isManager || user?.role === 'ANALYST';

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['offer-documents', id],
    queryFn: () => documentsService.getOfferDocuments(id),
    enabled: canUpload, // the documents API is ANALYST and above
  });

  const deleteDocMutation = useMutation({
    mutationFn: documentsService.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offer-documents', id] }),
  });

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Échec du téléchargement. Veuillez réessayer.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-brand-navy" />
      </div>
    );
  }
  if (!offer) {
    return <div className="text-center py-16 text-gray-500">Appel d'offres introuvable.</div>;
  }

  const isFinal = FINAL.includes(offer.status);
  const actions = isManager
    ? [
        ...(ACTIONS[offer.status] || []),
        ...(CANCELLABLE.includes(offer.status)
          ? [{ to: 'CANCELLED', label: 'Annulé / infructueux', variant: 'ghost', form: 'reason' }]
          : []),
      ]
    : [];
  const documentsList = Array.isArray(documents) ? documents : documents?.results || [];
  // The API removes bid_amount for users who may not see it.
  const bidHidden = !('bid_amount' in offer);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/offers')}
            className="mt-1 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{offer.title}</h1>
              <OfferStatusBadge status={offer.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{offer.buyer_name}</span>
              {offer.buyer_reference && <> · {offer.buyer_reference}</>}
              <span className="font-mono"> · {offer.reference_number}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isManager && !isFinal && (
            <Button variant="secondary" onClick={() => navigate(`/offers/${id}/edit`)}>
              <Edit size={16} />
              Modifier
            </Button>
          )}
          {actions.map((a) => (
            <Button key={a.to} variant={a.variant} onClick={() => setAction(a)}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tender, as published by the buyer */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Field label="Catégorie">{CATEGORY_LABELS[offer.category]}</Field>
          <Field label="Estimation de l'acheteur">{formatCurrency(offer.budget_estimate)}</Field>
          <Field label="Caution provisoire">{formatCurrency(offer.provisional_guarantee)}</Field>
          <Field label="Remise des plis">{formatDateTime(offer.submission_deadline)}</Field>
          <Field label="Ouverture des plis">{formatDateTime(offer.opening_date)}</Field>
          <Field label="Visite des lieux">{formatDateTime(offer.site_visit_date)}</Field>
          <Field label="Responsable">{offer.assigned_to?.full_name}</Field>
          <Field label="Annonce">
            {offer.source_url && (
              <a href={offer.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-navy hover:underline">
                Voir l'annonce <ExternalLink size={12} />
              </a>
            )}
          </Field>
          <Field label="Créé le">{formatDateTime(offer.created_at)}</Field>
          <Field label="Description" wide>
            <p className="text-gray-700 whitespace-pre-wrap">{offer.description}</p>
          </Field>
        </div>
      </Card>

      {/* N+ONE's bid and the result */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Offre N+ONE et résultat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Field label="Montant de l'offre (HT)">
            {bidHidden ? (
              <span className="inline-flex items-center gap-1 text-gray-500"><Lock size={12} /> Réservé aux managers</span>
            ) : formatCurrency(offer.bid_amount)}
          </Field>
          <Field label="Déposée le">{formatDateTime(offer.submitted_at)}</Field>
          <Field label="Rang de N+ONE">{offer.our_rank}</Field>
          <Field label="Attributaire">{offer.winner_name}</Field>
          <Field label="Montant retenu">{formatCurrency(offer.winning_amount)}</Field>
          <Field label="Motif" wide>{offer.outcome_reason}</Field>
        </div>
      </Card>

      {/* Documents */}
      {canUpload && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Pièces du dossier</h2>
            {!isFinal && (
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload size={14} />
                Ajouter une pièce
              </Button>
            )}
          </div>
          {loadingDocuments ? (
            <div className="flex justify-center py-12"><Spinner className="text-brand-navy" /></div>
          ) : documentsList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Aucune pièce pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documentsList.map((doc) => {
                const cat = DOC_CATEGORIES[doc.category] || { label: doc.category, variant: 'gray' };
                const expired = doc.expires_at && new Date(doc.expires_at) < new Date();
                return (
                  <li key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={18} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant={cat.variant}>{cat.label}</Badge>
                          {doc.is_encrypted && (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                              <Lock size={11} /> Chiffré (AES-256)
                            </span>
                          )}
                          {doc.expires_at && (
                            <span className={`text-xs ${expired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {expired ? 'Expiré le' : 'Expire le'} {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded text-gray-400 hover:text-brand-navy hover:bg-orange-50 transition-colors"
                        title="Télécharger"
                      >
                        <Download size={16} />
                      </button>
                      {isManager && (
                        <button
                          onClick={() => deleteDocMutation.mutate(doc.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {action && <TransitionModal offer={offer} action={action} onClose={() => setAction(null)} />}
      {uploadOpen && (
        <UploadModal offerId={id} canSeeFinancial={isManager} onClose={() => setUploadOpen(false)} />
      )}
    </div>
  );
}
