import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from '../src/hooks/useAuth';
import { useClients } from '../src/hooks/useClients';
import { useNotification } from '../src/utils/notifications';

// Mock axios
vi.mock('axios');

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with logged out state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should register user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('should handle registration error', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register({
        email: 'invalid',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'TestPassword123!');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('should logout user', async () => {
    const { result } = renderHook(() => useAuth());

    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'TestPassword123!');
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it('should persist authentication state', async () => {
    const { result: result1 } = renderHook(() => useAuth());

    await act(async () => {
      await result1.current.login('test@example.com', 'TestPassword123!');
    });

    // Create new hook instance
    const { result: result2 } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result2.current.isAuthenticated).toBe(true);
    });
  });
});

describe('useClients Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch clients', async () => {
    const { result } = renderHook(() => useClients());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await result.current.fetchClients(0, 10);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(Array.isArray(result.current.clients)).toBe(true);
    });
  });

  it('should create client', async () => {
    const { result } = renderHook(() => useClients());

    const newClient = {
      clientName: 'Test App',
      clientType: 'web',
      redirectUris: ['http://localhost:3000/callback'],
      allowedScopes: ['openid', 'profile'],
    };

    await act(async () => {
      await result.current.createClient(newClient);
    });

    await waitFor(() => {
      expect(result.current.clients).toContainEqual(
        expect.objectContaining({ clientName: 'Test App' })
      );
    });
  });

  it('should update client', async () => {
    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.updateClient('client-id', {
        clientName: 'Updated App',
      });
    });

    await waitFor(() => {
      expect(result.current.clients).toContainEqual(
        expect.objectContaining({ clientName: 'Updated App' })
      );
    });
  });

  it('should delete client', async () => {
    const { result } = renderHook(() => useClients());

    const initialCount = result.current.clients.length;

    await act(async () => {
      await result.current.deleteClient('client-id');
    });

    await waitFor(() => {
      expect(result.current.clients.length).toBe(initialCount - 1);
    });
  });

  it('should handle pagination', async () => {
    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.fetchClients(10, 20);
    });

    await waitFor(() => {
      expect(result.current.pagination.offset).toBe(10);
      expect(result.current.pagination.limit).toBe(20);
    });
  });
});

describe('useNotification Hook', () => {
  it('should add notification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
      });
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      title: 'Success',
      message: 'Operation completed',
    });
  });

  it('should remove notification', () => {
    const { result } = renderHook(() => useNotification());

    let notificationId: string;

    act(() => {
      notificationId = result.current.addNotification({
        type: 'info',
        title: 'Info',
        message: 'Test',
      });
    });

    expect(result.current.notifications.length).toBe(1);

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications.length).toBe(0);
  });

  it('should auto-remove notification after duration', async () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Auto remove',
        duration: 100,
      });
    });

    expect(result.current.notifications.length).toBe(1);

    await waitFor(
      () => {
        expect(result.current.notifications.length).toBe(0);
      },
      { timeout: 200 }
    );
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Success 1',
        message: 'Message 1',
      });
      result.current.addNotification({
        type: 'error',
        title: 'Error 1',
        message: 'Message 2',
      });
    });

    expect(result.current.notifications.length).toBe(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications.length).toBe(0);
  });
});
