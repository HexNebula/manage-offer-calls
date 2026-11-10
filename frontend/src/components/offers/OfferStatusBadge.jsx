import React from 'react';
import Badge from '../ui/Badge.jsx';

export const STATUS_CONFIG = {
  DETECTED: { label: 'Détecté', variant: 'gray' },
  PREPARING: { label: 'En préparation', variant: 'blue' },
  REVIEW: { label: 'En validation', variant: 'purple' },
  SUBMITTED: { label: 'Déposé', variant: 'yellow' },
  WON: { label: 'Gagné', variant: 'green' },
  LOST: { label: 'Perdu', variant: 'red' },
  NO_GO: { label: 'No-Go', variant: 'orange' },
  CANCELLED: { label: 'Annulé', variant: 'gray' },
};

export const IN_PROGRESS_STATUSES = ['DETECTED', 'PREPARING', 'REVIEW'];

export const CATEGORY_LABELS = {
  IT_INFRASTRUCTURE: 'Infrastructure IT',
  SERVICES: 'Services',
  WORKS: 'Travaux',
  SUPPLIES: 'Fournitures',
};

export default function OfferStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
