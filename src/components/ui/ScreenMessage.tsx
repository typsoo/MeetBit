import { Text, View } from "react-native";

type Props = {
  title: string;
  description?: string;
};

/** Loading, "not found" and failure share one layout. */
export function ScreenMessage({ title, description }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-canvas p-6">
      <Text className="text-center text-title text-ink">{title}</Text>
      {description ? (
        <Text className="text-center text-body text-ink-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
