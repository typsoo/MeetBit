import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { isNotFound } from "@/lib/trpc-error";

import { ScreenMessage } from "./ScreenMessage";

type Props = {
  children: ReactNode;
  /** From QueryErrorResetBoundary: clears the failed query before retrying. */
  onReset: () => void;
  /** Shown for any error that is not a missing event. */
  failureTitle: string;
};

type State = { error: Error | null };

/**
 * Catches what a suspense query throws. A missing event is a final state, a
 * failed request is not: the latter offers a retry that resets the query.
 */
export class QueryBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private retry = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (isNotFound(error)) {
      return (
        <ScreenMessage
          title="Event not found"
          description="The link is broken or the event was deleted."
        />
      );
    }

    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6">
        <Text className="text-center text-title text-ink">
          {this.props.failureTitle}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.retry}
          className="rounded-md bg-mint-deep px-4 py-2"
        >
          <Text className="text-body font-semibold text-paper">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
