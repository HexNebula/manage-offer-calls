import React from 'react';
import Badge from '../ui/Badge.jsx';

const STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', variant: 'gray' },
  PUBLISHED: { label: 'Publié', variant: 'blue' },
  EVALUATION: { label: 'Évaluation', variant: 'yellow' },
  AWARDED: { label: 'Attribué', variant: 'green' },
  CANCELLED: { label: 'Annulé', variant: 'red' },
};

export default function OfferStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
