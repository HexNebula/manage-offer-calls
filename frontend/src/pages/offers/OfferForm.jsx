import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { offersService } from '../../services/offers.js';
import { buyersService } from '../../services/buyers.js';
import { authService } from '../../services/auth.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { CATEGORY_LABELS } from '../../components/offers/OfferStatusBadge.jsx';

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const MONEY_FIELDS = ['budget_estimate', 'provisional_guarantee', 'bid_amount'];
const DATE_FIELDS = ['submission_deadline', 'opening_date', 'site_visit_date'];

function toDatetimeLocal(iso) {
  return iso ? iso.substring(0, 16) : ''; // "2026-05-01T14:00"
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100 first:border-0 first:pt-0">{children}</h2>;
}

export default function OfferFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canSeeFinancial = isAdmin || user?.role === 'MANAGER';

  const { data: offer, isLoading: loadingOffer } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersService.getOffer(id),
    enabled: isEdit,
  });

  // shortcut: loads up to 100 buyers in the dropdown; add a search field if N+ONE tracks more.
  const { data: buyersData } = useQuery({
    queryKey: ['buyers', 'all'],
    queryFn: () => buyersService.getBuyers({ page_size: 100 }),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: authService.getUsers,
    enabled: isAdmin,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  React.useEffect(() => {
    if (offer) {
      reset({
        ...offer,
        buyer: offer.buyer || '',
        budget_estimate: offer.budget_estimate ?? '',
        provisional_guarantee: offer.provisional_guarantee ?? '',
        bid_amount: offer.bid_amount ?? '',
        submission_deadline: toDatetimeLocal(offer.submission_deadline),
        opening_date: toDatetimeLocal(offer.opening_date),
        site_visit_date: toDatetimeLocal(offer.site_visit_date),
        assigned_to_id: offer.assigned_to?.id || '',
      });
    }
  }, [offer, reset]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? offersService.updateOffer(id, payload) : offersService.createOffer(payload)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
      navigate(`/offers/${data.id}`);
    },
  });

  const onSubmit = (data) => {
    const payload = {
      buyer: data.buyer,
      buyer_reference: data.buyer_reference || '',
      source_url: data.source_url || '',
      title: data.title,
      description: data.description,
      category: data.category,
    };
    // Empty inputs must reach the API as null, not "".
    [...MONEY_FIELDS, ...DATE_FIELDS].forEach((f) => { payload[f] = data[f] || null; });
    if (!canSeeFinancial) delete payload.bid_amount;
    if (isAdmin) payload.assigned_to_id = data.assigned_to_id || null;
    saveMutation.mutate(payload);
  };

  if (isEdit && loadingOffer) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  const buyerOptions = (buyersData?.results || []).map((b) => ({ value: b.id, label: b.name }));
  const userOptions = (users || []).map((u) => ({ value: u.id, label: `${u.full_name} (${u.email})` }));
  const serverError = saveMutation.error?.response?.data;
  const back = () => navigate(isEdit ? `/offers/${id}` : '/offers');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={back} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Modifier l'appel d'offres" : "Nouvel appel d'offres détecté"}
        </h1>
      </div>

      <Card>
        {serverError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {serverError.error || serverError.detail || JSON.stringify(serverError)}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <SectionTitle>Appel d'offres publié par l'acheteur</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label="Acheteur"
              required
              options={buyerOptions}
              placeholder="Sélectionner..."
              error={errors.buyer?.message}
              helperText={buyerOptions.length === 0 ? "Ajoutez d'abord l'acheteur dans « Acheteurs »." : undefined}
              {...register('buyer', { required: "L'acheteur est requis" })}
            />
            <Input label="Référence de l'acheteur" placeholder="AO n° 12/2026/..." {...register('buyer_reference')} />
          </div>

          <Input
            label="Objet"
            required
            error={errors.title?.message}
            {...register('title', { required: "L'objet est requis" })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="ml-1 text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              {...register('description', { required: 'La description est requise' })}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label="Catégorie"
              required
              options={CATEGORY_OPTIONS}
              placeholder="Sélectionner..."
              error={errors.category?.message}
              {...register('category', { required: 'La catégorie est requise' })}
            />
            <Input label="Lien de l'annonce" type="url" placeholder="https://www.marchespublics.gov.ma/..." {...register('source_url')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Estimation de l'acheteur (MAD)" type="number" min="0" step="0.01" {...register('budget_estimate')} />
            <Input label="Caution provisoire (MAD)" type="number" min="0" step="0.01" {...register('provisional_guarantee')} />
          </div>

          <SectionTitle>Échéances</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              label="Remise des plis"
              type="datetime-local"
              required
              error={errors.submission_deadline?.message}
              {...register('submission_deadline', { required: 'La date limite est requise' })}
            />
            <Input label="Ouverture des plis" type="datetime-local" {...register('opening_date')} />
            <Input label="Visite des lieux" type="datetime-local" {...register('site_visit_date')} />
          </div>

          {canSeeFinancial && <SectionTitle>Offre N+ONE</SectionTitle>}
          {canSeeFinancial && (
            <Input
              label="Montant de l'offre N+ONE (MAD HT)"
              type="number"
              min="0"
              step="0.01"
              helperText="Confidentiel : visible uniquement par les managers."
              {...register('bid_amount')}
            />
          )}
          {isAdmin && (
            <Select label="Responsable" options={userOptions} placeholder="Non assigné" {...register('assigned_to_id')} />
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={back}>Annuler</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {isEdit ? 'Enregistrer les modifications' : "Enregistrer l'appel d'offres"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
