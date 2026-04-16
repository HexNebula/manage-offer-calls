import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { authService } from '../../services/auth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ANALYST', label: 'Analyste' },
  { value: 'VIEWER', label: 'Lecteur' },
];

const ROLE_VARIANTS = {
  ADMIN: 'red',
  MANAGER: 'indigo',
  ANALYST: 'blue',
  VIEWER: 'gray',
};

export default function UserList() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: authService.getUsers,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const {
    register: regEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm();

  const createMutation = useMutation({
    mutationFn: authService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => authService.updateUser(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleEditOpen = (user) => {
    setEditUser(user);
    resetEdit({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department || '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  const userList = Array.isArray(users) ? users : users?.results || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {userList.length} utilisateur{userList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setAddOpen(true); reset(); }}>
          <Plus size={16} />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Nom complet', 'Email', 'Rôle', 'Département', 'Statut', 'Actions'].map((h) => (
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
            {userList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              userList.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <Badge variant={ROLE_VARIANTS[user.role] || 'gray'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {user.department || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={user.is_active ? 'green' : 'gray'}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEditOpen(user)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: user.id,
                            is_active: !user.is_active,
                          })
                        }
                        className={[
                          'flex items-center gap-1 text-xs transition-colors',
                          user.is_active
                            ? 'text-green-600 hover:text-red-600'
                            : 'text-gray-400 hover:text-green-600',
                        ].join(' ')}
                        title={user.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {user.is_active ? (
                          <ToggleRight size={18} />
                        ) : (
                          <ToggleLeft size={18} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); reset(); }}
        title="Ajouter un utilisateur"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <Input
            label="Nom complet"
            required
            error={errors.full_name?.message}
            {...register('full_name', { required: 'Requis' })}
          />
          <Input
            label="Adresse e-mail"
            type="email"
            required
            error={errors.email?.message}
            {...register('email', { required: 'Requis' })}
          />
          <Input
            label="Mot de passe"
            type="password"
            required
            error={errors.password?.message}
            {...register('password', {
              required: 'Requis',
              minLength: { value: 8, message: 'Minimum 8 caractères' },
            })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rôle"
              required
              options={ROLE_OPTIONS}
              placeholder="Sélectionner..."
              error={errors.role?.message}
              {...register('role', { required: 'Requis' })}
            />
            <Input
              label="Département"
              {...register('department')}
            />
          </div>
          {createMutation.error && (
            <p className="text-sm text-red-600">
              {createMutation.error?.response?.data?.detail || 'Erreur lors de la création.'}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setAddOpen(false); reset(); }}>
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Modifier l'utilisateur"
      >
        {editUser && (
          <form
            onSubmit={handleEditSubmit((data) =>
              updateMutation.mutate({ id: editUser.id, data })
            )}
            className="space-y-4"
          >
            <Input
              label="Nom complet"
              required
              error={editErrors.full_name?.message}
              {...regEdit('full_name', { required: 'Requis' })}
            />
            <Input
              label="Adresse e-mail"
              type="email"
              required
              error={editErrors.email?.message}
              {...regEdit('email', { required: 'Requis' })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Rôle"
                required
                options={ROLE_OPTIONS}
                error={editErrors.role?.message}
                {...regEdit('role', { required: 'Requis' })}
              />
              <Input
                label="Département"
                {...regEdit('department')}
              />
            </div>
            {updateMutation.error && (
              <p className="text-sm text-red-600">
                {updateMutation.error?.response?.data?.detail || 'Erreur lors de la mise à jour.'}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>
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
