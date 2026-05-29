import { apiClient } from './api-client';

export interface Role {
  id: number;
  name: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string | null;
  is_active: boolean;
  role_id: number;
  role_name: string;
  supabase_uid: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  actor_email: string | null;
  target_email: string | null;
  action: string;
  created_at: string;
}

export interface AuditLogsResponse {
  items: AuditLogEntry[];
  total_count: number;
  limit: number;
  offset: number;
  order: 'asc' | 'desc';
}

export interface AdminUsersResponse {
  items: UserData[];
  total_count: number;
  limit: number;
  offset: number;
  order: 'asc' | 'desc';
}

export interface BulkOperationResponse {
  total_requested: number;
  successful: number;
  failed: number;
  failures: Array<{ user_id: string; error: string }>;
}

export interface AuditActionsResponse {
  items: string[];
}

export const adminService = {
  getUsers: async (params: Record<string, string | number>) => {
    const searchParams = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    );
    return await apiClient.get<AdminUsersResponse>(`/v1/admin/users?${searchParams.toString()}`);
  },

  getRoles: async () => {
    return await apiClient.get<Role[]>('/v1/admin/roles');
  },

  updateUser: async (id: number, data: Partial<UserData>) => {
    return await apiClient.patch<UserData>(`/v1/admin/users/${id}`, data);
  },

  deleteUser: async (id: number) => {
    return await apiClient.delete(`/v1/admin/users/${id}`);
  },

  bulkDeactivateUsers: async (userIds: string[]) => {
    return await apiClient.post<BulkOperationResponse>('/v1/admin/users/bulk/deactivate', {
      user_ids: userIds,
    });
  },

  bulkUpdateRole: async (userIds: string[], roleId: number) => {
    return await apiClient.post<BulkOperationResponse>('/v1/admin/users/bulk/role', {
      user_ids: userIds,
      role_id: roleId,
    });
  },

  getAuditLogs: async (params: Record<string, string | number>) => {
    const searchParams = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    );
    return await apiClient.get<AuditLogsResponse>(`/v1/admin/audit-logs?${searchParams.toString()}`);
  },

  getAuditActions: async () => {
    return await apiClient.get<AuditActionsResponse>('/v1/admin/audit-actions');
  }
};
