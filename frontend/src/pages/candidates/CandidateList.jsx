import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search } from 'lucide-react';
import { candidatesService } from '../../services/candidates.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';

export default function CandidateList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search],
    queryFn: () => candidatesService.getCandidates(search ? { search } : {}),
  });

  const candidates = Array.isArray(data) ? data : data?.results || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  const createMutation = useMutation({
    mutationFn: candidatesService.createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setAddOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => candidatesService.updateCandidate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setSelectedCandidate(null);
    },
  });

  const columns = [
    {
      key: 'company_name',
      label: 'Entreprise',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    { key: 'contact_email', label: 'Email' },
    { key: 'contact_phone', label: 'Téléphone' },
    { key: 'registration_number', label: 'N° enregistrement' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidats</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {candidates.length} candidat{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            Ajouter un candidat
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Rechercher un candidat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <Table
          columns={columns}
          data={candidates}
          isLoading={isLoading}
          onRowClick={canManage ? (row) => {
            setSelectedCandidate(row);
            resetEdit({
              company_name: row.company_name,
              contact_email: row.contact_email,
              contact_phone: row.contact_phone,
              registration_number: row.registration_number,
            });
          } : undefined}
          emptyMessage="Aucun candidat trouvé"
        />
      </Card>

      {/* Add Candidate Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); reset(); }}
        title="Ajouter un candidat"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <Input
            label="Nom de l'entreprise"
            required
            error={errors.company_name?.message}
            {...register('company_name', { required: 'Requis' })}
          />
          <Input
            label="Email de contact"
            type="email"
            error={errors.contact_email?.message}
            {...register('contact_email')}
          />
          <Input
            label="Téléphone de contact"
            type="tel"
            error={errors.contact_phone?.message}
            {...register('contact_phone')}
          />
          <Input
            label="Numéro d'enregistrement"
            error={errors.registration_number?.message}
            {...register('registration_number')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setAddOpen(false); reset(); }}>
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Modifier le candidat"
      >
        {selectedCandidate && (
          <form
            onSubmit={handleEdit((data) =>
              updateMutation.mutate({ id: selectedCandidate.id, data })
            )}
            className="space-y-4"
          >
            <Input
              label="Nom de l'entreprise"
              required
              error={editErrors.company_name?.message}
              {...regEdit('company_name', { required: 'Requis' })}
            />
            <Input
              label="Email de contact"
              type="email"
              {...regEdit('contact_email')}
            />
            <Input
              label="Téléphone de contact"
              type="tel"
              {...regEdit('contact_phone')}
            />
            <Input
              label="Numéro d'enregistrement"
              {...regEdit('registration_number')}
            />

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">Soumissions</p>
              {(selectedCandidate.submissions || []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucune soumission associée.</p>
              ) : (
                <ul className="space-y-1">
                  {selectedCandidate.submissions.map((s) => (
                    <li key={s.id} className="text-sm text-gray-700">
                      Offre #{s.offer_call} — {s.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setSelectedCandidate(null)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
