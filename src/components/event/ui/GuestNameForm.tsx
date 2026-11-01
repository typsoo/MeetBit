import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type Props = {
  /** Pre-filled for a returning guest who has not saved a grid yet. */
  initialName?: string;
  onSubmit: (name: string) => void;
};

/**
 * Collects the guest name. The name becomes an identity only on submit,
 * and the server freezes it on the first saved grid.
 */
export function GuestNameForm({ initialName, onSubmit }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (trimmed.length > 50) {
      setError("Keep the name under 50 characters");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <View className="gap-2 border-t border-line-soft pt-4">
      <Text className="text-body text-ink-muted">
        Answer without an account: pick a name your group recognizes.
      </Text>
      <TextInput
        className="rounded-md border border-line bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-faint"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="Your name"
        maxLength={50}
      />
      {error ? <Text className="text-label text-danger">{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        className="items-center rounded-md bg-mint-deep px-4 py-3"
        style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
      >
        <Text className="text-body font-semibold text-paper">
          Join as a guest
        </Text>
      </Pressable>
      {initialName ? (
        <Text className="text-label text-ink-muted">
          You are joining as{" "}
          <Text className="font-bold text-mint-deep">{initialName}</Text>.
        </Text>
      ) : null}
    </View>
  );
}
