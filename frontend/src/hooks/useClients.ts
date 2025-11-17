import { useState, useCallback } from 'react';
import { apiClient } from '@services/apiClient';
import { OAuthClient, CreateClientRequest, UpdateClientRequest, PaginatedResponse } from '@types/index';

export const useClients = () => {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ offset: 0, limit: 10, total: 0 });

  const fetchClients = useCallback(async (offset = 0, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<PaginatedResponse<OAuthClient>>(
        `/v1/oauth/clients?offset=${offset}&limit=${limit}`
      );
      if (response.data.data) {
        setClients(response.data.data.items);
        setPagination({
          offset: response.data.data.offset,
          limit: response.data.data.limit,
          total: response.data.data.total,
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch clients';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData: CreateClientRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<OAuthClient>('/v1/oauth/clients', clientData);
      if (response.data.data) {
        setClients((prev) => [...prev, response.data.data!]);
        return response.data.data;
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create client';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (clientId: string, clientData: UpdateClientRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.put<OAuthClient>(`/v1/oauth/clients/${clientId}`, clientData);
      if (response.data.data) {
        setClients((prev) => prev.map((c) => (c.clientId === clientId ? response.data.data! : c)));
        return response.data.data;
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update client';
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
      await apiClient.delete(`/v1/oauth/clients/${clientId}`);
      setClients((prev) => prev.filter((c) => c.clientId !== clientId));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete client';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClient = useCallback(async (clientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<OAuthClient>(`/v1/oauth/clients/${clientId}`);
      return response.data.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch client';
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
      const response = await apiClient.post(`/v1/oauth/clients/${clientId}/revoke-secret`, {});
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

  return {
    clients,
    isLoading,
    error,
    pagination,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClient,
    revokeClientSecret,
  };
};
