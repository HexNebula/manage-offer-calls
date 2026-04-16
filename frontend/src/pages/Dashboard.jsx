import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  CalendarClock,
} from 'lucide-react';
import { offersService } from '../services/offers.js';
import { notificationsService } from '../services/notifications.js';
import Card, { CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import OfferStatusBadge from '../components/offers/OfferStatusBadge.jsx';

const STATUSES = ['DRAFT', 'PUBLISHED', 'EVALUATION', 'AWARDED', 'CANCELLED'];

const STATUS_ICONS = {
  DRAFT: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  PUBLISHED: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  EVALUATION: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  AWARDED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
};

const STATUS_LABELS = {
  DRAFT: 'Brouillons',
  PUBLISHED: 'Publiés',
  EVALUATION: 'En évaluation',
  AWARDED: 'Attribués',
  CANCELLED: 'Annulés',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isDeadlineNear(dateStr) {
  if (!dateStr) return false;
  const deadline = new Date(dateStr);
  const now = new Date();
  const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: allOffersData, isLoading: loadingOffers } = useQuery({
    queryKey: ['offers', 'all'],
    queryFn: () => offersService.getOffers({ page_size: 100 }),
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsService.getUnread,
    refetchInterval: 30000,
  });

  const offers = allOffersData?.results || [];

  // Status counts
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = offers.filter((o) => o.status === s).length;
    return acc;
  }, {});

  // Recent 5 offers
  const recentOffers = [...offers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = offers
    .filter((o) => isDeadlineNear(o.submission_deadline))
    .sort((a, b) => new Date(a.submission_deadline) - new Date(b.submission_deadline));

  if (loadingOffers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble des appels d'offres
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <Card className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </Card>

        {STATUSES.map((status) => {
          const cfg = STATUS_ICONS[status];
          const Icon = cfg.icon;
          return (
            <Card
              key={status}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/offers?status=${status}`)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={cfg.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts[status]}</p>
                  <p className="text-xs text-gray-500">{STATUS_LABELS[status]}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Notifications + Deadlines row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unread notifications card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/notifications')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <Bell size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {unreadData?.count ?? 0}
              </p>
              <p className="text-xs text-gray-500">Notifications non lues</p>
            </div>
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CalendarClock size={18} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Échéances dans les 7 prochains jours
            </h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-4">Aucune échéance imminente.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingDeadlines.slice(0, 5).map((offer) => {
                const daysLeft = Math.ceil(
                  (new Date(offer.submission_deadline) - new Date()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <li
                    key={offer.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-orange-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/offers/${offer.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{offer.title}</p>
                      <p className="text-xs text-gray-500">{offer.reference_number}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        {daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(offer.submission_deadline)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent offers table */}
      <Card padding={false}>
        <CardHeader className="px-5 pt-5">
          <CardTitle>Offres récentes</CardTitle>
          <button
            onClick={() => navigate('/offers')}
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            Voir tout
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Référence', 'Titre', 'Catégorie', 'Statut', 'Échéance'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOffers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                    Aucune offre pour le moment.
                  </td>
                </tr>
              ) : (
                recentOffers.map((offer) => (
                  <tr
                    key={offer.id}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/offers/${offer.id}`)}
                  >
                    <td className="px-5 py-3 text-sm font-mono text-gray-600">
                      {offer.reference_number}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {offer.title}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {offer.category}
                    </td>
                    <td className="px-5 py-3">
                      <OfferStatusBadge status={offer.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDate(offer.submission_deadline)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
