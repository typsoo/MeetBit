import { Text, View } from "react-native";

type Props = {
  name: string;
};

/** The saved name is shown but not editable: one id, one name per event. */
export function SavedNameNotice({ name }: Props) {
  return (
    <View className="border-t border-line-soft pt-4">
      <Text className="text-body text-ink-muted">
        You are answering as{" "}
        <Text className="font-bold text-mint-deep">{name}</Text>. Your name is
        locked for this event.
      </Text>
    </View>
  );
}
