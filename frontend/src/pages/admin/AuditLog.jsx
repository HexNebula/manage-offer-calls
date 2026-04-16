import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../../services/auth.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Button from '../../components/ui/Button.jsx';

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'CREATE', label: 'Création' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
  { value: 'LOGIN', label: 'Connexion' },
  { value: 'LOGOUT', label: 'Déconnexion' },
  { value: 'PUBLISH', label: 'Publication' },
  { value: 'CLOSE', label: 'Fermeture' },
  { value: 'AWARD', label: 'Attribution' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'UPLOAD', label: 'Téléversement' },
];

const ACTION_VARIANTS = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'indigo',
  LOGOUT: 'gray',
  PUBLISH: 'blue',
  CLOSE: 'yellow',
  AWARD: 'green',
  EXPORT: 'purple',
  UPLOAD: 'orange',
};

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', actionFilter, page],
    queryFn: () =>
      authService.getAuditLog({
        action: actionFilter || undefined,
        page,
      }),
  });

  const logs = Array.isArray(data) ? data : data?.results || [];
  const totalCount = data?.count ?? logs.length;
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Traçabilité de toutes les actions réalisées dans le système
        </p>
      </div>

      {/* Filter */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-56">
            <Select
              options={ACTION_OPTIONS}
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {totalCount} entrée{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            Aucune entrée dans le journal.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Horodatage',
                    'Utilisateur',
                    'Action',
                    'Type de ressource',
                    'ID ressource',
                    'Détails',
                  ].map((h) => (
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
                {logs.map((log, i) => (
                  <tr key={log.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                      {formatDateTime(log.timestamp || log.created_at)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {log.user_email || log.user || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={ACTION_VARIANTS[log.action] || 'gray'}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {log.resource_type || log.content_type || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">
                      {log.resource_id || log.object_id || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {log.details || log.changes
                        ? JSON.stringify(log.details || log.changes)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {(hasNext || hasPrev) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalCount} entrée{totalCount !== 1 ? 's' : ''} au total
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
