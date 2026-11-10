import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search, Trash2 } from 'lucide-react';
import { buyersService } from '../../services/buyers.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';

const TYPE_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Privé' },
];

const EMPTY = { name: '', type: 'PUBLIC', contact_email: '', contact_phone: '', address: '' };

function apiError(err) {
  const data = err?.response?.data;
  if (!data) return null;
  return data.error || data.detail || Object.values(data).flat().join(' ');
}

// One form for create and edit: `buyer` is null when creating.
function BuyerFormModal({ buyer, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    values: buyer ? { ...EMPTY, ...buyer } : EMPTY,
  });

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['buyers'] });
    onClose();
  };
  const saveMutation = useMutation({
    mutationFn: (data) => (buyer ? buyersService.updateBuyer(buyer.id, data) : buyersService.createBuyer(data)),
    onSuccess: done,
  });
  const deleteMutation = useMutation({
    mutationFn: () => buyersService.deleteBuyer(buyer.id),
    onSuccess: done,
  });

  const error = apiError(saveMutation.error) || apiError(deleteMutation.error);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={buyer ? "Modifier l'acheteur" : 'Ajouter un acheteur'}>
      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}
        <Input
          label="Nom de l'organisme"
          required
          error={errors.name?.message}
          {...register('name', { required: 'Requis' })}
        />
        <Select label="Type" options={TYPE_OPTIONS} {...register('type')} />
        <Input label="Email de contact" type="email" {...register('contact_email')} />
        <Input label="Téléphone" type="tel" {...register('contact_phone')} />
        <Input label="Adresse" {...register('address')} />
        <div className="flex justify-between gap-3 pt-2">
          {buyer ? (
            <Button
              variant="ghost"
              type="button"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 size={14} />
              Supprimer
            </Button>
          ) : <span />}
          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>Enregistrer</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function BuyerList() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  // undefined = closed, null = creating, object = editing
  const [editing, setEditing] = useState(undefined);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['buyers', search],
    queryFn: () => buyersService.getBuyers(search ? { search } : {}),
  });
  const buyers = data?.results || [];

  const columns = [
    {
      key: 'name',
      label: 'Organisme',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => <Badge variant={val === 'PUBLIC' ? 'blue' : 'purple'}>{val === 'PUBLIC' ? 'Public' : 'Privé'}</Badge>,
    },
    { key: 'contact_email', label: 'Email' },
    { key: 'contact_phone', label: 'Téléphone' },
    { key: 'address', label: 'Adresse' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acheteurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organismes qui publient les appels d'offres auxquels N+ONE répond
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <Plus size={16} />
            Ajouter un acheteur
          </Button>
        )}
      </div>

      <Card>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un acheteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </Card>

      <Card padding={false}>
        <Table
          columns={columns}
          data={buyers}
          isLoading={isLoading}
          onRowClick={canManage ? (row) => setEditing(row) : undefined}
          emptyMessage="Aucun acheteur trouvé"
        />
      </Card>

      {editing !== undefined && (
        <BuyerFormModal buyer={editing} isOpen onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
