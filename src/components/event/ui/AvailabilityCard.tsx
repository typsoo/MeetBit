import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  children: ReactNode;
};

/** The answering card: heading, hint and whatever the identity state allows. */
export function AvailabilityCard({ children }: Props) {
  return (
    <View
      className="w-full gap-2 rounded-lg border border-line bg-surface p-5"
      style={{ maxWidth: 900 }}
    >
      <Text className="text-subtitle font-semibold text-ink">
        When are you busy?
      </Text>
      <Text className="text-label text-ink-muted">
        Hold and drag across cells to mark busy times; drag over marked cells to
        clear them. Saving replaces your whole previous grid.
      </Text>
      {children}
    </View>
  );
}
