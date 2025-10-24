import { useEffect, useRef } from 'react';
import { connectAdminSocket } from '../realtime/socket';

/**
 * useAdminRealtime
 * Hook to subscribe to admin realtime events without page reloads.
 *
 * onOrderCreated: (payload: { order, user }) => void
 * onOrderUpdated: (payload: { order }) => void
 * onUserCreated:  (payload: { user }) => void
 */
export default function useAdminRealtime({ token, onOrderCreated, onOrderUpdated, onUserCreated } = {}) {
  const handlersRef = useRef({ onOrderCreated, onOrderUpdated, onUserCreated });
  handlersRef.current = { onOrderCreated, onOrderUpdated, onUserCreated };

  useEffect(() => {
    const sock = connectAdminSocket(token);

    const hCreated = (p) => handlersRef.current.onOrderCreated?.(p);
    const hUpdated = (p) => handlersRef.current.onOrderUpdated?.(p);
    const hUser = (p) => handlersRef.current.onUserCreated?.(p);

    sock.on('order:created', hCreated);
    sock.on('order:updated', hUpdated);
    sock.on('user:created', hUser);

    return () => {
      sock.off('order:created', hCreated);
      sock.off('order:updated', hUpdated);
      sock.off('user:created', hUser);
    };
  }, [token]);
}
