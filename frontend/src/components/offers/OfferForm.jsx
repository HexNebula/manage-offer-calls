import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { authService } from '../../services/auth.js';
import { useAuth } from '../../hooks/useAuth.js';

const CATEGORY_OPTIONS = [
  { value: 'IT_INFRASTRUCTURE', label: 'Infrastructure IT' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'WORKS', label: 'Travaux' },
  { value: 'SUPPLIES', label: 'Fournitures' },
];

export default function OfferFormComponent({ defaultValues = {}, onSubmit, isLoading = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: authService.getUsers,
    enabled: isAdmin,
  });

  const userOptions = (users || []).map((u) => ({
    value: u.id,
    label: `${u.full_name} (${u.email})`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Titre"
        required
        error={errors.title?.message}
        {...register('title', { required: 'Le titre est requis' })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={4}
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Select
          label="Catégorie"
          required
          error={errors.category?.message}
          options={CATEGORY_OPTIONS}
          placeholder="Sélectionner..."
          {...register('category', { required: 'La catégorie est requise' })}
        />

        <Input
          label="Budget estimatif (MAD)"
          type="number"
          min="0"
          step="0.01"
          error={errors.budget_estimate?.message}
          {...register('budget_estimate')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          label="Date limite de soumission"
          type="datetime-local"
          required
          error={errors.submission_deadline?.message}
          {...register('submission_deadline', {
            required: 'La date limite est requise',
          })}
        />

        <Input
          label="Date limite d'évaluation"
          type="datetime-local"
          error={errors.evaluation_deadline?.message}
          {...register('evaluation_deadline')}
        />
      </div>

      {isAdmin && (
        <Select
          label="Assigné à"
          options={userOptions}
          placeholder="Non assigné"
          {...register('assigned_to')}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" isLoading={isLoading}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
