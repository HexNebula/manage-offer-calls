import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Calendar, CheckCircle, Upload } from 'lucide-react';
import { getPublicOffer, submitProposal } from '../../services/portalApi.js';
import logo from '../../assets/Nplus-one-logo-1.png';

const CATEGORY_LABELS = {
  IT_INFRASTRUCTURE: 'Infrastructure IT',
  SERVICES: 'Services',
  WORKS: 'Travaux',
  SUPPLIES: 'Fournitures',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PortalOfferSubmit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(null);
  const [serverError, setServerError] = useState('');

  const { data: offer, isLoading, isError } = useQuery({
    queryKey: ['portal-offer', id],
    queryFn: () => getPublicOffer(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const selectedFile = watch('proposal_file');

  const onSubmit = async (data) => {
    setServerError('');
    const formData = new FormData();
    formData.append('company_name', data.company_name);
    formData.append('contact_email', data.contact_email);
    formData.append('contact_phone', data.contact_phone);
    formData.append('address', data.address || '');
    formData.append('registration_number', data.registration_number || '');
    formData.append('proposal_file', data.proposal_file[0]);

    try {
      const result = await submitProposal(id, formData);
      setSuccess(result);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data || {})[0]?.[0] ||
        'Une erreur est survenue. Veuillez réessayer.';
      setServerError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <p className="text-red-500 font-medium">Appel d'offres introuvable ou clôturé.</p>
          <button onClick={() => navigate('/portal')} className="mt-4 text-sm text-gray-500 underline">
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#F77F00' }} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Soumission reçue !</h2>
          <p className="text-gray-500 text-sm mb-6">
            Votre dossier a bien été reçu pour l'appel d'offres{' '}
            <span className="font-semibold text-gray-700">{success.offer_reference}</span>.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-1">Référence de votre soumission</p>
            <p className="font-mono text-sm font-medium text-gray-800 break-all">{success.submission_id}</p>
          </div>
          <p className="text-xs text-gray-400">
            Conservez cette référence. Notre équipe vous contactera pour la suite du processus.
          </p>
          <button
            onClick={() => navigate('/portal')}
            className="mt-6 text-sm underline"
            style={{ color: '#003049' }}
          >
            Retour à la liste des appels d'offres
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#003049' }} className="shadow-md">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="N+ONE Datacenters" className="h-10 w-auto object-contain" />
            <p className="text-blue-200 text-xs">Portail des Appels d'Offres</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour à la liste
        </button>

        {/* Offer info card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-400">{offer.reference_number}</span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#F77F00' }}
            >
              {CATEGORY_LABELS[offer.category] || offer.category}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{offer.title}</h1>
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{offer.description}</p>
          {offer.submission_deadline && (
            <div className="flex items-center gap-1.5 mt-4 text-sm text-gray-500">
              <Calendar size={14} />
              <span>Date limite de soumission :</span>
              <span className="font-medium text-gray-700">{formatDate(offer.submission_deadline)}</span>
            </div>
          )}
        </div>

        {/* Submission form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Soumettre votre offre</h2>
          <p className="text-sm text-gray-500 mb-6">
            Remplissez le formulaire ci-dessous et joignez votre dossier de candidature (PDF, DOCX ou XLSX, max 10 Mo).
          </p>

          {serverError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Company name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003049] ${
                    errors.company_name ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="Acme Corp SARL"
                  {...register('company_name', { required: "Le nom de l'entreprise est requis" })}
                />
                {errors.company_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.company_name.message}</p>
                )}
              </div>

              {/* Registration number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro RC / ICE
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  placeholder="RC 123456"
                  {...register('registration_number')}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail de contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003049] ${
                    errors.contact_email ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="contact@entreprise.ma"
                  {...register('contact_email', {
                    required: "L'e-mail est requis",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail invalide' },
                  })}
                />
                {errors.contact_email && (
                  <p className="text-xs text-red-500 mt-1">{errors.contact_email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003049] ${
                    errors.contact_phone ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="+212 6XX XXX XXX"
                  {...register('contact_phone', { required: 'Le téléphone est requis' })}
                />
                {errors.contact_phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.contact_phone.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003049] resize-none"
                placeholder="Rue, ville, pays"
                {...register('address')}
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dossier de candidature <span className="text-red-500">*</span>
              </label>
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                errors.proposal_file ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  {selectedFile && selectedFile[0] ? (
                    <p className="text-sm font-medium text-gray-700">{selectedFile[0].name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium" style={{ color: '#003049' }}>Cliquez pour choisir</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX — max 10 Mo</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  {...register('proposal_file', { required: 'Le fichier est requis' })}
                />
              </label>
              {errors.proposal_file && (
                <p className="text-xs text-red-500 mt-1">{errors.proposal_file.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-md text-white font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#003049' }}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Soumettre ma candidature'}
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-8">
        © {new Date().getFullYear()} N+ONE Datacenters — Casablanca
      </footer>
    </div>
  );
}
