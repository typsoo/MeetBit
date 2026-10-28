import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { trpc } from '@/lib/trpc';

type ServerStatus = 'checking' | 'ok' | 'error';

const statusLabels: Record<ServerStatus, string> = {
  checking: 'checking…',
  ok: 'ok',
  error: 'unreachable',
};

export default function HomeScreen() {
  const [status, setStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    let active = true;

    trpc.system.status
      .query()
      .then((result) => {
        if (active) {
          setStatus(result.status === 'ok' ? 'ok' : 'error');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MeetBit</Text>
      <Text style={styles.subtitle}>Find a time that works for everyone.</Text>
      <Text style={styles.status}>Server: {statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  status: {
    fontSize: 13,
    opacity: 0.6,
  },
});
