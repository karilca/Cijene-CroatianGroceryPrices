import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params: Record<string, string | number>) => [...adminKeys.users(), params] as const,
  roles: () => [...adminKeys.all, 'roles'] as const,
  auditLogs: () => [...adminKeys.all, 'auditLogs'] as const,
  auditLogList: (params: Record<string, string | number>) => [...adminKeys.auditLogs(), params] as const,
  auditActions: () => [...adminKeys.all, 'auditActions'] as const,
};

export function useAdminUsers(params: Record<string, string | number>) {
  return useQuery({
    queryKey: adminKeys.userList(params),
    queryFn: () => adminService.getUsers(params),
    staleTime: 5000,
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: adminKeys.roles(),
    queryFn: () => adminService.getRoles(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supabaseUid, data }: { supabaseUid: string; data: { name?: string; is_active: boolean; role_id: number } }) =>
      adminService.updateUser(supabaseUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supabaseUid, confirmEmail, reason }: { supabaseUid: string; confirmEmail: string; reason?: string }) =>
      adminService.deleteUser(supabaseUid, confirmEmail, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

export function useBulkDeactivateUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => adminService.bulkDeactivateUsers(userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

export function useBulkUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userIds, roleId }: { userIds: string[]; roleId: number }) => adminService.bulkUpdateRole(userIds, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() });
    },
  });
}

export function useAuditLogs(params: Record<string, string | number>) {
  return useQuery({
    queryKey: adminKeys.auditLogList(params),
    queryFn: () => adminService.getAuditLogs(params),
    staleTime: 5000,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: adminKeys.auditActions(),
    queryFn: () => adminService.getAuditActions(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
