import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Upload,
  Download,
  Trash2,
  Plus,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { offersService } from '../../services/offers.js';
import { documentsService } from '../../services/documents.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import OfferStatusBadge from '../../components/offers/OfferStatusBadge.jsx';
import Input from '../../components/ui/Input.jsx';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(value);
}

function SubmissionRow({ submission, offerId }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-3 text-sm text-gray-900">
        {submission.candidate_name || submission.candidate || '—'}
      </td>
      <td className="px-5 py-3 text-sm text-gray-600">
        {formatDateTime(submission.submitted_at)}
      </td>
      <td className="px-5 py-3 text-sm text-gray-700">
        {submission.technical_score ?? '—'}
      </td>
      <td className="px-5 py-3 text-sm text-gray-700">
        {submission.financial_score ?? '—'}
      </td>
      <td className="px-5 py-3">
        <Badge variant={submission.status === 'ACCEPTED' ? 'green' : submission.status === 'REJECTED' ? 'red' : 'gray'}>
          {submission.status || '—'}
        </Badge>
      </td>
    </tr>
  );
}

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('submissions');
  const [addSubmissionOpen, setAddSubmissionOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersService.getOffer(id),
  });

  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => offersService.getSubmissions(id),
    enabled: activeTab === 'submissions',
  });

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['offer-documents', id],
    queryFn: () => documentsService.getOfferDocuments(id),
    enabled: activeTab === 'documents',
  });

  const publishMutation = useMutation({
    mutationFn: () => offersService.publishOffer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offer', id] }),
  });

  const closeMutation = useMutation({
    mutationFn: () => offersService.closeOffer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offer', id] }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => documentsService.deleteDocument(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offer-documents', id] }),
  });

  // Add submission form
  const {
    register: regSub,
    handleSubmit: handleSub,
    reset: resetSub,
    formState: { errors: subErrors, isSubmitting: submittingAdd },
  } = useForm();

  const createSubmissionMutation = useMutation({
    mutationFn: (data) => offersService.createSubmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', id] });
      setAddSubmissionOpen(false);
      resetSub();
    },
  });

  // Score form
  const {
    register: regScore,
    handleSubmit: handleScore,
    reset: resetScore,
    formState: { isSubmitting: submittingScore },
  } = useForm();

  const awardMutation = useMutation({
    mutationFn: () => offersService.awardOffer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offer', id] }),
  });

  const scoreMutation = useMutation({
    mutationFn: ({ subId, data }) => offersService.scoreSubmission(id, subId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', id] });
      setScoreModalOpen(false);
      resetScore();
    },
  });

  // Upload document form
  const {
    register: regUpload,
    handleSubmit: handleUpload,
    reset: resetUpload,
    formState: { isSubmitting: submittingUpload },
  } = useForm();

  const uploadMutation = useMutation({
    mutationFn: (formData) => documentsService.uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-documents', id] });
      setUploadDocOpen(false);
      resetUpload();
    },
  });

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || doc.name || `document-${doc.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
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
    return (
      <div className="text-center py-16 text-gray-500">Offre introuvable.</div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canEdit =
    (isAdmin || isManager) &&
    (offer.assigned_to?.id === user?.id || isAdmin) &&
    offer.status !== 'AWARDED' &&
    offer.status !== 'CANCELLED';

  const submissionsList = Array.isArray(submissions)
    ? submissions
    : submissions?.results || [];

  const documentsList = Array.isArray(documents)
    ? documents
    : documents?.results || [];

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
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
            <p className="text-sm text-gray-500 font-mono mt-1">{offer.reference_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/offers/${id}/edit`)}
            >
              <Edit size={16} />
              Modifier
            </Button>
          )}
          {offer.status === 'DRAFT' && (isAdmin || isManager) && (
            <Button
              variant="primary"
              isLoading={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              Publier
            </Button>
          )}
          {offer.status === 'PUBLISHED' && (isAdmin || isManager) && (
            <Button
              variant="warning"
              isLoading={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              Fermer pour évaluation
            </Button>
          )}
          {offer.status === 'EVALUATION' && (isAdmin || isManager) && (
            <Button
              variant="success"
              isLoading={awardMutation.isPending}
              onClick={() => awardMutation.mutate()}
            >
              Attribuer
            </Button>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Catégorie</p>
            <p className="mt-1 text-sm text-gray-900">{offer.category || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget estimatif</p>
            <p className="mt-1 text-sm text-gray-900">{formatCurrency(offer.budget_estimate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigné à</p>
            <p className="mt-1 text-sm text-gray-900">{offer.assigned_to_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date limite soumission</p>
            <p className="mt-1 text-sm text-gray-900">{formatDateTime(offer.submission_deadline)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date limite évaluation</p>
            <p className="mt-1 text-sm text-gray-900">{formatDateTime(offer.evaluation_deadline)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Créé le</p>
            <p className="mt-1 text-sm text-gray-900">{formatDateTime(offer.created_at)}</p>
          </div>
          {offer.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{offer.description}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Onglets">
          {['submissions', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-brand-orange text-brand-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab === 'submissions' ? 'Soumissions' : 'Documents'}
              {tab === 'submissions' && submissionsList.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                  {submissionsList.length}
                </span>
              )}
              {tab === 'documents' && documentsList.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                  {documentsList.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Soumissions des candidats</h2>
            {(isAdmin || isManager) && offer.status !== 'DRAFT' && (
              <Button size="sm" onClick={() => setAddSubmissionOpen(true)}>
                <Plus size={14} />
                Ajouter
              </Button>
            )}
          </div>
          {loadingSubmissions ? (
            <div className="flex justify-center py-12">
              <Spinner className="text-brand-navy" />
            </div>
          ) : submissionsList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              Aucune soumission pour le moment.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Candidat', 'Soumis le', 'Score technique', 'Score financier', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissionsList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {sub.candidate_name || sub.candidate || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDateTime(sub.submitted_at)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {sub.technical_score ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {sub.financial_score ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          sub.status === 'ACCEPTED'
                            ? 'green'
                            : sub.status === 'REJECTED'
                            ? 'red'
                            : 'gray'
                        }
                      >
                        {sub.status || 'PENDING'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {(isAdmin || isManager || user?.role === 'ANALYST') && (
                        <button
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setScoreModalOpen(true);
                          }}
                          className="text-xs text-brand-navy hover:underline"
                        >
                          Scorer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Documents de l'appel d'offres</h2>
            {(isAdmin || isManager) && (
              <Button size="sm" onClick={() => setUploadDocOpen(true)}>
                <Upload size={14} />
                Téléverser
              </Button>
            )}
          </div>
          {loadingDocuments ? (
            <div className="flex justify-center py-12">
              <Spinner className="text-brand-navy" />
            </div>
          ) : documentsList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              Aucun document pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documentsList.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.file_name || doc.name || `Document #${doc.id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.is_sensitive && (
                          <span className="inline-flex items-center gap-1 text-orange-500">
                            <AlertTriangle size={11} />
                            Sensible
                          </span>
                        )}
                      </p>
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
                    {(isAdmin || isManager) && (
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
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Add Submission Modal */}
      <Modal
        isOpen={addSubmissionOpen}
        onClose={() => setAddSubmissionOpen(false)}
        title="Ajouter une soumission"
      >
        <form
          onSubmit={handleSub((data) => createSubmissionMutation.mutate(data))}
          className="space-y-4"
        >
          <Input
            label="Nom du candidat / Entreprise"
            required
            error={subErrors.candidate_name?.message}
            {...regSub('candidate_name', { required: 'Requis' })}
          />
          <Input
            label="Date de soumission"
            type="datetime-local"
            {...regSub('submitted_at')}
          />
          <Input
            label="Score technique"
            type="number"
            min="0"
            max="100"
            step="0.1"
            {...regSub('technical_score')}
          />
          <Input
            label="Score financier"
            type="number"
            min="0"
            max="100"
            step="0.1"
            {...regSub('financial_score')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddSubmissionOpen(false)} type="button">
              Annuler
            </Button>
            <Button type="submit" isLoading={submittingAdd || createSubmissionMutation.isPending}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Score Modal */}
      <Modal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        title="Évaluer la soumission"
      >
        <form
          onSubmit={handleScore((data) =>
            scoreMutation.mutate({ subId: selectedSubmission?.id, data })
          )}
          className="space-y-4"
        >
          <Input
            label="Score technique (0–100)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue={selectedSubmission?.technical_score}
            {...regScore('technical_score')}
          />
          <Input
            label="Score financier (0–100)"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue={selectedSubmission?.financial_score}
            {...regScore('financial_score')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setScoreModalOpen(false)} type="button">
              Annuler
            </Button>
            <Button type="submit" isLoading={scoreMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadDocOpen}
        onClose={() => setUploadDocOpen(false)}
        title="Téléverser un document"
      >
        <form
          onSubmit={handleUpload((data) => {
            const formData = new FormData();
            formData.append('file', data.file[0]);
            formData.append('offer_call', id);
            formData.append('is_sensitive', data.is_sensitive ? 'true' : 'false');
            uploadMutation.mutate(formData);
          })}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-brand-navy hover:file:bg-orange-100"
              {...regUpload('file', { required: true })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
              {...regUpload('is_sensitive')}
            />
            Document sensible
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setUploadDocOpen(false)} type="button">
              Annuler
            </Button>
            <Button type="submit" isLoading={uploadMutation.isPending}>
              Téléverser
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
