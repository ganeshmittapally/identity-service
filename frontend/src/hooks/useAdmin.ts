import { useState, useCallback } from 'react';
import { apiClient } from '@services/apiClient';
import { User, OAuthClient, AdminStats, AuditLog, PaginatedResponse } from '@types/index';

export const useAdmin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AdminStats>('/v1/admin/stats');
      if (response.data.data) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch admin stats';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (offset = 0, limit = 10, role?: string, status?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = `/v1/admin/users?offset=${offset}&limit=${limit}`;
      if (role) query += `&role=${role}`;
      if (status) query += `&status=${status}`;
      
      const response = await apiClient.get<PaginatedResponse<User>>(query);
      if (response.data.data) {
        setUsers(response.data.data.items);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch users';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async (offset = 0, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<PaginatedResponse<OAuthClient>>(
        `/v1/admin/clients?offset=${offset}&limit=${limit}`
      );
      if (response.data.data) {
        setClients(response.data.data.items);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch clients';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (offset = 0, limit = 20, action?: string, admin?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = `/v1/admin/audit-logs?offset=${offset}&limit=${limit}`;
      if (action) query += `&action=${action}`;
      if (admin) query += `&admin=${admin}`;
      
      const response = await apiClient.get<PaginatedResponse<AuditLog>>(query);
      if (response.data.data) {
        setAuditLogs(response.data.data.items);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch audit logs';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suspendUser = useCallback(async (userId: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post(`/v1/admin/users/${userId}/suspend`, { reason });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'suspended' } : u))
      );
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to suspend user';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsuspendUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post(`/v1/admin/users/${userId}/unsuspend`, {});
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
      );
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to unsuspend user';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetUserLoginAttempts = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post(`/v1/admin/users/${userId}/reset-attempts`, {});
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to reset login attempts';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeClientSecret = useCallback(async (clientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/v1/admin/clients/${clientId}/revoke-secret`, {});
      if (response.data.data) {
        setClients((prev) =>
          prev.map((c) => (c.clientId === clientId ? { ...c, ...response.data.data } : c))
        );
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to revoke client secret';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/v1/admin/clients/${clientId}`);
      setClients((prev) => prev.filter((c) => c.clientId !== clientId));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete client';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSystemConfig = useCallback(async (config: Record<string, any>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.put('/v1/admin/config', config);
      return response.data.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update system config';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    users,
    clients,
    stats,
    auditLogs,
    isLoading,
    error,
    fetchStats,
    fetchUsers,
    fetchClients,
    fetchAuditLogs,
    suspendUser,
    unsuspendUser,
    resetUserLoginAttempts,
    revokeClientSecret,
    deleteClient,
    updateSystemConfig,
  };
};
