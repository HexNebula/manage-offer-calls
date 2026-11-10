import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, Trophy, XCircle, Percent, Bell, CalendarClock } from 'lucide-react';
import { offersService } from '../services/offers.js';
import { notificationsService } from '../services/notifications.js';
import Card, { CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import OfferStatusBadge, { IN_PROGRESS_STATUSES } from '../components/offers/OfferStatusBadge.jsx';

function KpiCard({ icon: Icon, color, bg, value, label, onClick }) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

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
    queryFn: () => offersService.getOffers({ page_size: 500 }),
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsService.getUnread,
    refetchInterval: 30000,
  });

  const offers = allOffersData?.results || [];

  const count = (status) => offers.filter((o) => o.status === status).length;
  const won = count('WON');
  const lost = count('LOST');
  const winRate = won + lost > 0 ? `${Math.round((100 * won) / (won + lost))} %` : '—';

  // Recent 5 offers
  const recentOffers = [...offers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Submission deadlines in the next 7 days, only for tenders still being prepared
  const upcomingDeadlines = offers
    .filter((o) => IN_PROGRESS_STATUSES.includes(o.status) && isDeadlineNear(o.submission_deadline))
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
          Appels d'offres suivis et réponses de N+ONE
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={FileText} color="text-blue-600" bg="bg-blue-100"
          value={offers.filter((o) => IN_PROGRESS_STATUSES.includes(o.status)).length}
          label="En cours (détecté → validation)"
          onClick={() => navigate('/offers?status=PREPARING')}
        />
        <KpiCard
          icon={Send} color="text-yellow-600" bg="bg-yellow-100"
          value={count('SUBMITTED')} label="Déposés, en attente"
          onClick={() => navigate('/offers?status=SUBMITTED')}
        />
        <KpiCard
          icon={Trophy} color="text-green-600" bg="bg-green-100"
          value={won} label="Gagnés" onClick={() => navigate('/offers?status=WON')}
        />
        <KpiCard
          icon={XCircle} color="text-red-500" bg="bg-red-100"
          value={lost} label="Perdus" onClick={() => navigate('/offers?status=LOST')}
        />
        <KpiCard icon={Percent} color="text-indigo-600" bg="bg-indigo-100" value={winRate} label="Taux de succès" />
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
                {unreadData?.unread_count ?? 0}
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
              Remises des plis dans les 7 prochains jours
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
                      <p className="text-xs text-gray-500">{offer.buyer_name} · {offer.reference_number}</p>
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
          <CardTitle>Appels d'offres récents</CardTitle>
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
                {['Référence', 'Objet', 'Acheteur', 'Statut', 'Remise des plis'].map((h) => (
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
                      {offer.buyer_name}
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
