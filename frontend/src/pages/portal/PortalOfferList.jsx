import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { getPublicOffers } from '../../services/portalApi.js';
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
  });
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span className="text-xs text-red-600 font-medium">Délai dépassé</span>;
  if (diff <= 3) return <span className="text-xs text-orange-600 font-medium">Plus que {diff} jour{diff > 1 ? 's' : ''}</span>;
  return <span className="text-xs text-gray-500">{formatDate(deadline)}</span>;
}

export default function PortalOfferList() {
  const navigate = useNavigate();

  const { data: offers = [], isLoading, isError } = useQuery({
    queryKey: ['portal-offers'],
    queryFn: getPublicOffers,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#003049' }} className="shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="N+ONE Datacenters" className="h-10 w-auto object-contain" />
            <p className="text-blue-200 text-xs">Portail des Appels d'Offres</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ backgroundColor: '#003049' }} className="pb-10 pt-2">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-white mt-4">Appels d'offres ouverts</h1>
          <p className="text-blue-200 mt-2 text-sm">
            Consultez nos appels d'offres en cours et soumettez votre candidature en ligne.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="text-center py-20 text-gray-400">Chargement des appels d'offres...</div>
        )}

        {isError && (
          <div className="text-center py-20 text-red-500">
            Impossible de charger les appels d'offres. Veuillez réessayer.
          </div>
        )}

        {!isLoading && !isError && offers.length === 0 && (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Aucun appel d'offres ouvert</p>
            <p className="text-gray-400 text-sm mt-1">Revenez prochainement.</p>
          </div>
        )}

        <div className="grid gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => navigate(`/portal/${offer.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">{offer.reference_number}</span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#F77F00' }}
                    >
                      {CATEGORY_LABELS[offer.category] || offer.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-[#003049] transition-colors">
                    {offer.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{offer.description}</p>
                </div>

                <ArrowRight
                  size={20}
                  className="text-gray-300 group-hover:text-[#F77F00] transition-colors flex-shrink-0 mt-1"
                />
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar size={14} />
                  <span>Clôture :</span>
                  <DeadlineBadge deadline={offer.submission_deadline} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-8">
        © {new Date().getFullYear()} N+ONE Datacenters — Casablanca
      </footer>
    </div>
  );
}
