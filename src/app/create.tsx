import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { eventCreateInput, type EventCreateInput } from '@/lib/event-schema';
import { trpc } from '@/lib/trpc';

type FieldKey = keyof EventCreateInput;
type FieldErrors = Partial<Record<FieldKey, string>>;

const STEP_OPTIONS: Array<EventCreateInput['stepMinutes']> = [30, 60];

/** The device timezone as a sensible starting value; the user can overwrite it. */
function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/** '09:30' → 570. Returns null for anything that is not a valid HH:MM time. */
function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Maps the first zod issue per field into a { field: message } record. */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as FieldKey] = issue.message;
    }
  }
  return errors;
}

export default function CreateEventScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [stepMinutes, setStepMinutes] = useState<EventCreateInput['stepMinutes']>(30);
  const [timezone, setTimezone] = useState(guessTimezone);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitError(null);

    // HH:MM strings are a form-only concern: the schema speaks minutes.
    const workStartMinutes = parseTimeToMinutes(workStart);
    const workEndMinutes = parseTimeToMinutes(workEnd);
    const errors: FieldErrors = {};
    if (workStartMinutes === null) {
      errors.workStartMinutes = 'Use HH:MM, for example 09:00';
    }
    if (workEndMinutes === null) {
      errors.workEndMinutes = 'Use HH:MM, for example 18:00';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // The same schema the server validates with: one source of truth for
    // every rule, including the cross-field ones.
    const parsed = eventCreateInput.safeParse({
      name,
      description: description.trim() || undefined,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      workStartMinutes,
      workEndMinutes,
      stepMinutes,
      timezone: timezone.trim(),
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await trpc.event.create.mutate(parsed.data);
      router.push(`/e/${created.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not create the event',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create event</Text>
        <Text style={styles.subtitle}>
          Participants will mark their availability on the grid.
        </Text>

        <Field label="Name" error={fieldErrors.name}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Board game night"
          />
        </Field>

        <Field label="Description (optional)" error={fieldErrors.description}>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this about?"
            multiline
          />
        </Field>

        <View style={styles.row}>
          <Field label="Start date" error={fieldErrors.startDate}>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </Field>
          <Field label="End date" error={fieldErrors.endDate}>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </Field>
        </View>

        <View style={styles.row}>
          <Field label="Work from" error={fieldErrors.workStartMinutes}>
            <TextInput
              style={styles.input}
              value={workStart}
              onChangeText={setWorkStart}
              placeholder="09:00"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Work to" error={fieldErrors.workEndMinutes}>
            <TextInput
              style={styles.input}
              value={workEnd}
              onChangeText={setWorkEnd}
              placeholder="18:00"
              autoCapitalize="none"
            />
          </Field>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Grid step</Text>
          <View style={styles.stepRow}>
            {STEP_OPTIONS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setStepMinutes(option)}
                style={[
                  styles.stepOption,
                  stepMinutes === option && styles.stepOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.stepText,
                    stepMinutes === option && styles.stepTextSelected,
                  ]}
                >
                  {option} min
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Field label="Timezone" error={fieldErrors.timezone}>
          <TextInput
            style={styles.input}
            value={timezone}
            onChangeText={setTimezone}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating…' : 'Create event'}
          </Text>
        </Pressable>

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      </View>
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f3f1f2',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: 16,
    marginTop: 24,
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#fbf9fa',
    borderWidth: 1,
    borderColor: '#ded8da',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b6368',
    marginTop: -8,
  },
  field: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4448',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ded8da',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ded8da',
    backgroundColor: '#ffffff',
  },
  stepOptionSelected: {
    borderColor: '#23644f',
    backgroundColor: '#e7efec',
  },
  stepText: {
    fontSize: 14,
    color: '#4a4448',
  },
  stepTextSelected: {
    color: '#23644f',
    fontWeight: '600',
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#23644f',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  fieldError: {
    fontSize: 12,
    color: '#8a2f2f',
  },
  error: {
    fontSize: 14,
    color: '#8a2f2f',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.55,
  },
});
