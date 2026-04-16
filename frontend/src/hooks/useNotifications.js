import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.js';
import { useAuth } from './useAuth.js';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsService.getUnread,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    unreadCount: unreadQuery.data?.unread_count ?? 0,
    unreadList: [],
    isLoading: unreadQuery.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
