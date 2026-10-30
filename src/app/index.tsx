import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

type ServerStatus = 'checking' | 'ok' | 'error';

const statusLabels: Record<ServerStatus, string> = {
  checking: 'checking…',
  ok: 'ok',
  error: 'unreachable',
};

export default function HomeScreen() {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, isPending } = authClient.useSession();

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

  async function handleSignIn() {
    setActionError(null);
    setIsSubmitting(true);

    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });

    if (error) {
      setActionError(error.message ?? 'Could not start the Google sign-in');
    }
    setIsSubmitting(false);
  }

  async function handleSignOut() {
    setActionError(null);
    setIsSubmitting(true);

    const { error } = await authClient.signOut();
    if (error) {
      setActionError(error.message ?? 'Could not sign out');
    }
    setIsSubmitting(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>MeetBit</Text>
        <Text style={styles.subtitle}>Find a time that works for everyone.</Text>

        <View style={styles.account}>
          {isPending ? (
            <Text style={styles.muted}>Checking your session…</Text>
          ) : session ? (
            <>
              <Text style={styles.signedIn}>Signed in as {session.user.name}</Text>
              <Text style={styles.muted}>{session.user.email}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  isSubmitting && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.muted}>Sign in to create events and answer on your phone.</Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleSignIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isSubmitting && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Opening Google…' : 'Sign in with Google'}
                </Text>
              </Pressable>
            </>
          )}

          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </View>

        <Text style={styles.status}>Server: {statusLabels[status]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f1f2',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#fbf9fa',
    borderWidth: 1,
    borderColor: '#ded8da',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a4448',
  },
  account: {
    gap: 8,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e2e4',
  },
  signedIn: {
    fontSize: 16,
    fontWeight: '600',
  },
  muted: {
    fontSize: 14,
    color: '#6b6368',
  },
  primaryButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#23644f',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23644f',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#23644f',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    fontSize: 14,
    color: '#8a2f2f',
  },
  status: {
    marginTop: 16,
    fontSize: 12,
    color: '#8a8287',
  },
});
