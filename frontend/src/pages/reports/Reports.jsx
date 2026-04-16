import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileText } from 'lucide-react';
import { offersService } from '../../services/offers.js';
import { reportsService } from '../../services/reports.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import OfferStatusBadge from '../../components/offers/OfferStatusBadge.jsx';
import Badge from '../../components/ui/Badge.jsx';

function openBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export default function Reports() {
  const { user } = useAuth();
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const canAccess =
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'ANALYST';

  const { data, isLoading } = useQuery({
    queryKey: ['offers', 'reports'],
    queryFn: () => offersService.getOffers({ page_size: 100 }),
    enabled: canAccess,
  });

  const offers = data?.results || [];

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const blob = await reportsService.exportAllOffers();
      openBlob(blob, 'appels-offres-rapport.pdf');
    } catch (err) {
      console.error('Export failed:', err);
      alert("Échec de l'export. Veuillez réessayer.");
    } finally {
      setExportingAll(false);
    }
  };

  const handleExportOffer = async (offer) => {
    setExportingId(offer.id);
    try {
      const blob = await reportsService.exportOffer(offer.id);
      openBlob(blob, `offre-${offer.reference_number || offer.id}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
      alert("Échec de l'export. Veuillez réessayer.");
    } finally {
      setExportingId(null);
    }
  };

  if (!canAccess) {
    return (
      <div className="text-center py-16 text-gray-500">
        Accès non autorisé.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Export PDF des appels d'offres
          </p>
        </div>
        <Button
          onClick={handleExportAll}
          isLoading={exportingAll}
          variant="primary"
        >
          <FileDown size={16} />
          Exporter tout (PDF)
        </Button>
      </div>

      {/* Global export card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FileText size={24} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Rapport global des appels d'offres</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Exporte l'ensemble des appels d'offres avec leurs statistiques en format PDF.
            </p>
          </div>
          <Button
            className="ml-auto"
            onClick={handleExportAll}
            isLoading={exportingAll}
            variant="secondary"
          >
            <FileDown size={16} />
            Télécharger
          </Button>
        </div>
      </Card>

      {/* Per-offer exports */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Exporter par appel d'offres
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-indigo-600" />
          </div>
        ) : offers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            Aucun appel d'offres disponible.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {offer.title}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {offer.reference_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  <OfferStatusBadge status={offer.status} />
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={exportingId === offer.id}
                    onClick={() => handleExportOffer(offer)}
                  >
                    <FileDown size={14} />
                    PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
