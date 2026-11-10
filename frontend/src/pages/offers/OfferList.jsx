import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { offersService } from '../../services/offers.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import OfferStatusBadge, { STATUS_CONFIG, CATEGORY_LABELS } from '../../components/offers/OfferStatusBadge.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  ...Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label })),
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes les catégories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function OfferList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
  });
  const [search, setSearch] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search }));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Sync filters to URL params
  useEffect(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['offers', filters],
    queryFn: () =>
      offersService.getOffers({
        status: filters.status || undefined,
        category: filters.category || undefined,
        search: filters.search || undefined,
      }),
  });

  const offers = data?.results || [];

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const columns = [
    {
      key: 'reference_number',
      label: 'Référence',
      render: (val) => (
        <span className="font-mono text-xs text-gray-600">{val}</span>
      ),
    },
    {
      key: 'title',
      label: 'Objet',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          {row.buyer_reference && <p className="text-xs text-gray-500">{row.buyer_reference}</p>}
        </div>
      ),
    },
    {
      key: 'buyer_name',
      label: 'Acheteur',
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (val) => CATEGORY_LABELS[val] || val,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (val) => <OfferStatusBadge status={val} />,
    },
    {
      key: 'submission_deadline',
      label: 'Remise des plis',
      render: (val) => formatDate(val),
    },
    {
      key: 'assigned_to',
      label: 'Assigné à',
      render: (val, row) => row.assigned_to_name || '—',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appels d'offres</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count ?? offers.length} offre{(data?.count ?? offers.length) !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/offers/new')}>
            <Plus size={16} />
            Nouvel appel d'offres
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                placeholder="Rechercher par objet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="w-48">
            <Select
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            />
          </div>
          <div className="w-48">
            <Select
              options={CATEGORY_OPTIONS}
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          {(filters.status || filters.category || filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ status: '', category: '', search: '' });
                setSearch('');
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={offers}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/offers/${row.id}`)}
          emptyMessage="Aucun appel d'offres trouvé"
        />
      </Card>
    </div>
  );
}
