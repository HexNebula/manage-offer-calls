import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { notificationsService } from '../../services/notifications.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => notificationsService.getNotifications({ page }),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = Array.isArray(data) ? data : data?.results || [];
  const totalCount = data?.count ?? notifications.length;
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="red">{unreadCount} non lues</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <CheckCheck size={16} />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* List */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-indigo-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell size={48} strokeWidth={1} className="mb-4" />
            <p className="text-sm text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={[
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  !notif.is_read ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                {/* Unread indicator */}
                <div className="flex-shrink-0 mt-1">
                  {notif.is_read ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      'text-sm',
                      notif.is_read ? 'text-gray-700' : 'font-semibold text-gray-900',
                    ].join(' ')}
                  >
                    {notif.title || notif.message || notif.verb}
                  </p>
                  {notif.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.created_at || notif.timestamp)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {notif.offer_call && (
                    <button
                      onClick={() => navigate(`/offers/${notif.offer_call}`)}
                      className="p-1 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Voir l'offre"
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                  {!notif.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Pagination */}
      {(hasNext || hasPrev) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalCount} notification{totalCount !== 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <span className="text-sm text-gray-600">Page {page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
