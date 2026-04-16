import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { offersService } from '../../services/offers.js';
import { authService } from '../../services/auth.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useForm } from 'react-hook-form';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const CATEGORY_OPTIONS = [
  { value: 'IT_INFRASTRUCTURE', label: 'Infrastructure IT' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'WORKS', label: 'Travaux' },
  { value: 'SUPPLIES', label: 'Fournitures' },
];

function toDatetimeLocal(iso) {
  if (!iso) return '';
  return iso.substring(0, 16); // "2024-05-01T14:00"
}

export default function OfferFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: offer, isLoading: loadingOffer } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersService.getOffer(id),
    enabled: isEdit,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: authService.getUsers,
    enabled: isAdmin,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  // Populate form when offer data loads
  React.useEffect(() => {
    if (offer) {
      reset({
        title: offer.title || '',
        description: offer.description || '',
        category: offer.category || '',
        budget_estimate: offer.budget_estimate || '',
        submission_deadline: toDatetimeLocal(offer.submission_deadline),
        evaluation_deadline: toDatetimeLocal(offer.evaluation_deadline),
        assigned_to: offer.assigned_to || '',
      });
    }
  }, [offer, reset]);

  const createMutation = useMutation({
    mutationFn: offersService.createOffer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      navigate(`/offers/${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => offersService.updateOffer(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      navigate(`/offers/${id}`);
    },
  });

  const onSubmit = (data) => {
    const payload = {
      ...data,
      budget_estimate: data.budget_estimate ? parseFloat(data.budget_estimate) : null,
      assigned_to: data.assigned_to || null,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const serverError = createMutation.error || updateMutation.error;

  if (isEdit && loadingOffer) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  const userOptions = (users || []).map((u) => ({
    value: u.id,
    label: `${u.full_name} (${u.email})`,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isEdit ? `/offers/${id}` : '/offers')}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}
          </h1>
        </div>
      </div>

      <Card>
        {serverError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {serverError?.response?.data?.detail ||
              JSON.stringify(serverError?.response?.data) ||
              'Une erreur est survenue.'}
          </div>
        )}

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
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(isEdit ? `/offers/${id}` : '/offers')}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isPending || isSubmitting}>
              {isEdit ? 'Enregistrer les modifications' : "Créer l'appel d'offres"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
