import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  free: string[];
  busy: string[];
  onClose: () => void;
};

/**
 * Who is free and who is busy on one grid slot. Presentational on purpose:
 * the caller decides where the lists come from (mock data in the prototype,
 * aggregate.heatmap on the real event page).
 */
export function SlotInfoCard({ title, free, busy, onClose }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-scrim p-6"
        onPress={onClose}
      >
        {/* The inner press stops the backdrop press from closing the card. */}
        <Pressable
          className="w-full max-w-sm gap-4 rounded-lg bg-surface p-5"
          onPress={() => {}}
        >
          <View className="gap-1">
            <Text className="text-title text-ink">{title}</Text>
            <Text className="text-label text-ink-muted">
              {free.length + busy.length} people answered
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-label font-semibold text-ink">
              Free ({free.length})
            </Text>
            {free.length === 0 ? (
              <Text className="text-body text-ink-faint">Nobody is free</Text>
            ) : (
              free.map((name) => (
                <View key={name} className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-pill bg-success" />
                  <Text className="text-body text-ink">{name}</Text>
                </View>
              ))
            )}
          </View>

          <View className="gap-2">
            <Text className="text-label font-semibold text-ink">
              Busy ({busy.length})
            </Text>
            {busy.length === 0 ? (
              <Text className="text-body text-ink-faint">Nobody is busy</Text>
            ) : (
              busy.map((name) => (
                <View key={name} className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-pill bg-busy" />
                  <Text className="text-body text-ink">{name}</Text>
                </View>
              ))
            )}
          </View>

          <Pressable
            className="items-center rounded-md bg-mint-light py-2"
            onPress={onClose}
          >
            <Text className="text-body font-semibold text-mint-deep">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
