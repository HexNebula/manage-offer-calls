import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'Aucune donnée', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon size={48} strokeWidth={1} className="mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
