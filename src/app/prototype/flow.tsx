// Two variants of the scheduling user journey, switchable via ?variant=, on /prototype/flow
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { PrototypeSwitcher, VariantOption } from "@/components/PrototypeSwitcher";

const VARIANTS: VariantOption[] = [
  { key: "A", name: "Participant Voting" },
  { key: "B", name: "Finalize & Month Calendar" },
];

const DAYS = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"];
const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

type SlotData = {
  dayIndex: number;
  hour: string;
  free: number;
  total: number;
  step: 0 | 1 | 2 | 3 | 4;
  imported?: boolean;
  usosTitle?: string;
};

// Seed availability dataset
const INITIAL_SLOTS: SlotData[] = [
  { dayIndex: 0, hour: "09:00", free: 4, total: 8, step: 2 },
  { dayIndex: 1, hour: "09:00", free: 6, total: 8, step: 3 },
  { dayIndex: 2, hour: "09:00", free: 2, total: 8, step: 1 },
  { dayIndex: 3, hour: "09:00", free: 8, total: 8, step: 4 },
  { dayIndex: 4, hour: "09:00", free: 0, total: 8, step: 0 },
  { dayIndex: 5, hour: "09:00", free: 1, total: 8, step: 1 },
  { dayIndex: 6, hour: "09:00", free: 2, total: 8, step: 1 },

  { dayIndex: 0, hour: "09:30", free: 6, total: 8, step: 3 },
  { dayIndex: 1, hour: "09:30", free: 8, total: 8, step: 4 },
  { dayIndex: 2, hour: "09:30", free: 5, total: 8, step: 2 },
  { dayIndex: 3, hour: "09:30", free: 7, total: 8, step: 3 },
  { dayIndex: 4, hour: "09:30", free: 2, total: 8, step: 1 },
  { dayIndex: 5, hour: "09:30", free: 0, total: 8, step: 0 },
  { dayIndex: 6, hour: "09:30", free: 0, total: 8, step: 0 },

  { dayIndex: 0, hour: "10:00", free: 8, total: 8, step: 4 },
  { dayIndex: 1, hour: "10:00", free: 8, total: 8, step: 4 },
  { dayIndex: 2, hour: "10:00", free: 8, total: 8, step: 4 },
  { dayIndex: 3, hour: "10:00", free: 7, total: 8, step: 3 },
  { dayIndex: 4, hour: "10:00", free: 4, total: 8, step: 2 },
  { dayIndex: 5, hour: "10:00", free: 1, total: 8, step: 1 },
  { dayIndex: 6, hour: "10:00", free: 0, total: 8, step: 0, imported: true, usosTitle: "Math Lab" },

  { dayIndex: 0, hour: "10:30", free: 8, total: 8, step: 4 },
  { dayIndex: 1, hour: "10:30", free: 6, total: 8, step: 3 },
  { dayIndex: 2, hour: "10:30", free: 8, total: 8, step: 4 },
  { dayIndex: 3, hour: "10:30", free: 5, total: 8, step: 2 },
  { dayIndex: 4, hour: "10:30", free: 3, total: 8, step: 1 },
  { dayIndex: 5, hour: "10:30", free: 0, total: 8, step: 0 },
  { dayIndex: 6, hour: "10:30", free: 0, total: 8, step: 0, imported: true, usosTitle: "Math Lab" },

  { dayIndex: 0, hour: "11:00", free: 4, total: 8, step: 2 },
  { dayIndex: 1, hour: "11:00", free: 5, total: 8, step: 2 },
  { dayIndex: 2, hour: "11:00", free: 2, total: 8, step: 1 },
  { dayIndex: 3, hour: "11:00", free: 3, total: 8, step: 1 },
  { dayIndex: 4, hour: "11:00", free: 0, total: 8, step: 0 },
  { dayIndex: 5, hour: "11:00", free: 0, total: 8, step: 0, imported: true, usosTitle: "Physics Lecture" },
  { dayIndex: 6, hour: "11:00", free: 0, total: 8, step: 0, imported: true, usosTitle: "Physics Lecture" },

  { dayIndex: 0, hour: "11:30", free: 3, total: 8, step: 1 },
  { dayIndex: 1, hour: "11:30", free: 4, total: 8, step: 2 },
  { dayIndex: 2, hour: "11:30", free: 7, total: 8, step: 3 },
  { dayIndex: 3, hour: "11:30", free: 2, total: 8, step: 1 },
  { dayIndex: 4, hour: "11:30", free: 0, total: 8, step: 0 },
  { dayIndex: 5, hour: "11:30", free: 0, total: 8, step: 0, imported: true, usosTitle: "Physics Lecture" },
  { dayIndex: 6, hour: "11:30", free: 0, total: 8, step: 0 },
];

const CELL_HEIGHT = 44;

/**
 * Ramp steps: the group's availability. `line` is the fill mixed with 14% ink
 * (22% paper on the darkest step) so cell borders exist on every step without
 * introducing a second grey.
 */
const STEPS: Record<
  0 | 1 | 2 | 3 | 4,
  { fill: string; text: string; line: string; hatch: string; hatchOpacity: number }
> = {
  0: { fill: "bg-busy", text: "text-busy-ink", line: "#DFAF97", hatch: "#162620", hatchOpacity: 0.45 },
  1: { fill: "bg-free-1", text: "text-ink", line: "#A5D5BA", hatch: "#162620", hatchOpacity: 0.45 },
  2: { fill: "bg-free-2", text: "text-ink", line: "#7FC7A3", hatch: "#162620", hatchOpacity: 0.45 },
  3: { fill: "bg-free-3", text: "text-ink", line: "#56B189", hatch: "#162620", hatchOpacity: 0.45 },
  4: { fill: "bg-free-4", text: "text-paper", line: "#569A80", hatch: "#FFFFFF", hatchOpacity: 0.7 },
};

/** Diagonal hatch: "I cannot come". Drawn over the ramp, never instead of it. */
function HatchPattern({ color, opacity }: { color: string; opacity: number }) {
  const lines = [];
  for (let x = -CELL_HEIGHT; x < 96; x += 8) {
    lines.push(
      <Line
        key={x}
        x1={x}
        y1={CELL_HEIGHT}
        x2={x + CELL_HEIGHT}
        y2={0}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1}
      />
    );
  }
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
    >
      {lines}
    </Svg>
  );
}

// -------------------------------------------------------------
// REUSABLE POP-UP MODAL: Triggered by double-clicking any slot
// -------------------------------------------------------------
function SlotDetailsModal({
  slot,
  onClose,
}: {
  slot: SlotData | null;
  onClose: () => void;
}) {
  if (!slot) return null;

  const percent = Math.round((slot.free / slot.total) * 100);

  return (
    <Modal visible={!!slot} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-scrim items-center justify-center p-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-surface p-6 gap-4 shadow-2xl border border-line"
        >
          {/* Header */}
          <View className="flex-row items-start justify-between border-b border-line-soft pb-3">
            <View className="gap-0.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-caption font-bold text-mint-dark uppercase tracking-wider">
                  Interval Details
                </Text>
                <View className="rounded-pill bg-mint-light px-2 py-0.5 border border-mint-soft">
                  <Text className="text-[10px] font-bold text-mint-dark">{percent}% fit</Text>
                </View>
              </View>
              <Text className="text-title font-bold text-ink">
                {DAYS[slot.dayIndex]} · {slot.hour}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-surface-subtle items-center justify-center border border-line active:bg-mint-light"
            >
              <Text className="text-ink font-bold text-sm">✕</Text>
            </Pressable>
          </View>

          {/* Group status pill */}
          <View className="flex-row items-center justify-between rounded-xl bg-mint-light p-3.5 border border-mint-soft">
            <Text className="text-label font-bold text-mint-dark">Availability Ratio:</Text>
            <Text className="text-label font-bold text-mint-deep">
              {slot.free} of {slot.total} members free
            </Text>
          </View>

          {/* Attendee breakdown */}
          <View className="gap-3">
            {/* Free */}
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-mint-deep" />
                <Text className="text-body font-bold text-ink">
                  Available ({slot.free}):
                </Text>
              </View>
              <Text className="text-body text-ink-muted pl-4">
                Anya (Host), Boris, Vera, Gosha, Dasha
                {slot.free > 5 ? ", Egor, Zhenya, Zina" : ""}
              </Text>
            </View>

            {/* Busy */}
            {slot.total - slot.free > 0 && (
              <View className="gap-1">
                <View className="flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full bg-blush-deep" />
                  <Text className="text-body font-bold text-blush-deep">
                    Busy ({slot.total - slot.free}):
                  </Text>
                </View>
                <Text className="text-body text-ink-muted pl-4">
                  Egor{" "}
                  <Text className="text-caption font-semibold text-imported-ink">
                    ({slot.usosTitle ? `USOS: ${slot.usosTitle}` : "USOS: Lecture"})
                  </Text>
                  , Zhenya, Zina
                </Text>
              </View>
            )}

            {/* Not answered. Neutral, not a warning: no amber in the palette. */}
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-ink-faint" />
                <Text className="text-body font-bold text-ink">
                  Not answered (4):
                </Text>
              </View>
              <Text className="text-body text-ink-muted pl-4">
                Igor, Kate, Leo, Maria — not counted in the ratio
              </Text>
            </View>
          </View>

          {/* Action button */}
          <View className="flex-row justify-end pt-3 border-t border-line-soft">
            <Pressable
              onPress={onClose}
              className="rounded-xl bg-mint-deep px-5 py-2.5 active:bg-mint-dark shadow-sm"
            >
              <Text className="text-label font-bold text-paper">Close</Text>
            </Pressable>
          </View>        </Pressable>
      </Pressable>
    </Modal>
  );
}

// -------------------------------------------------------------
// VARIANT A: Participant Voting (Clean slot selection)
// -------------------------------------------------------------
function VariantA() {
  const [userName, setUserName] = useState("Alex Kowalski");
  const [nameFocused, setNameFocused] = useState(false);
  const [paintMode, setPaintMode] = useState<"free" | "busy">("free");
  const [includeLectures, setIncludeLectures] = useState(true);
  const [mySlots, setMySlots] = useState<Record<string, "free" | "busy">>({
    "0-09:30": "free",
    "0-10:00": "free",
    "0-10:30": "free",
    "1-10:00": "free",
    "1-10:30": "free",
    "2-10:00": "free",
    "2-10:30": "free",
    "2-11:00": "busy",
    "3-09:30": "busy",
  });
  const [popupSlot, setPopupSlot] = useState<SlotData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const lastTapRef = useRef<Record<string, number>>({});

  const handleCellPress = (slot: SlotData) => {
    const key = `${slot.dayIndex}-${slot.hour}`;
    const now = Date.now();
    const last = lastTapRef.current[key] || 0;

    if (now - last < 350) {
      // Double tap / double click opens pop-up
      setPopupSlot(slot);
      lastTapRef.current[key] = 0;
    } else {
      // Single tap paints slot
      lastTapRef.current[key] = now;
      const isUSOS =
        (slot.dayIndex === 5 && slot.hour === "11:00") ||
        (slot.dayIndex === 6 && (slot.hour === "10:00" || slot.hour === "10:30"));

      if (!isUSOS) {
        setMySlots((prev) => {
          const copy = { ...prev };
          if (copy[key] === paintMode) {
            delete copy[key];
          } else {
            copy[key] = paintMode;
          }
          return copy;
        });
        setSubmitted(false);
      }
    }
  };

  const freeCount = Object.values(mySlots).filter((v) => v === "free").length;
  const busyCount = Object.values(mySlots).filter((v) => v === "busy").length;

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={styles.scroll}>
      {/* Top Header Card with Name Input */}
      <View className="rounded-2xl bg-surface p-5 border border-line gap-4 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="gap-1 flex-1">
            <Text className="text-display font-bold text-ink">BIT Web Recruitment</Text>
            <Text className="text-body text-ink-muted">March 12 – 18 · 30-min intervals</Text>
          </View>
          <View className="rounded-pill bg-mint-light px-3.5 py-1 border border-mint-soft">
            <Text className="text-label font-bold text-mint-dark">✓ 8/12 Responded</Text>
          </View>
        </View>

        {/* Name input directly at top */}
        <View className="rounded-xl bg-mint-light p-3.5 border border-mint-soft flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-label font-bold text-mint-dark">Your Name:</Text>
            <TextInput
              value={userName}
              onChangeText={setUserName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Enter your name"
              placeholderTextColor="#768C81"
              className={`flex-1 rounded-lg bg-surface px-3 py-1.5 text-body font-bold text-ink border ${
                nameFocused ? "border-mint-deep" : "border-line-strong"
              }`}
            />
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-mint-deep" />
            <Text className="text-caption font-semibold text-mint-dark">Session Active</Text>
          </View>
        </View>

        {/* USOS schedule banner */}
        <View className="rounded-xl bg-surface-subtle p-3 border border-line-soft flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"
                fill="#4E6359"
              />
            </Svg>
            <Text className="text-caption font-semibold text-ink">
              USOS iCal synced: 3 university classes locked in grey
            </Text>
          </View>
          <Pressable
            onPress={() => setIncludeLectures(!includeLectures)}
            className="flex-row items-center gap-1.5"
          >
            <View
              className={`h-4 w-4 rounded border items-center justify-center ${
                includeLectures ? "bg-mint-deep border-mint-deep" : "border-line-strong bg-surface"
              }`}
            >
              {includeLectures ? (
                <Text className="text-[10px] text-paper font-bold">✓</Text>
              ) : null}
            </View>
            <Text className="text-caption text-ink-muted">Block Lectures</Text>
          </Pressable>
        </View>
      </View>

      {/* Pure Slot Picking Toolbar with Mint & Blush */}
      <View className="rounded-2xl bg-surface p-4 border border-line gap-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-label font-bold text-ink">Select Paint Tool:</Text>
          <Text className="text-caption text-ink-muted">
            💡 Double-click any cell to inspect attendees
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          {/* Mint Free Button */}
          <Pressable
            onPress={() => setPaintMode("free")}
            className={`flex-1 rounded-xl p-3 flex-row items-center justify-center gap-2 border-2 ${
              paintMode === "free"
                ? "bg-mint-light border-mint-deep shadow-sm"
                : "bg-surface-subtle border-transparent"
            }`}
          >
            <View className="h-3 w-3 rounded-full bg-mint-deep" />
            <Text
              className={`text-body font-bold ${
                paintMode === "free" ? "text-mint-dark" : "text-ink-muted"
              }`}
            >
              Mark Free (Available)
            </Text>
          </Pressable>

          {/* Blush Busy Button */}
          <Pressable
            onPress={() => setPaintMode("busy")}
            className={`flex-1 rounded-xl p-3 flex-row items-center justify-center gap-2 border-2 ${
              paintMode === "busy"
                ? "bg-blush-light border-blush-deep shadow-sm"
                : "bg-surface-subtle border-transparent"
            }`}
          >
            <View className="h-3 w-3 rounded-full bg-blush-deep" />
            <Text
              className={`text-body font-bold ${
                paintMode === "busy" ? "text-blush-deep" : "text-ink-muted"
              }`}
            >
              Mark Busy (Hatch)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Interactive Slot Grid */}
      <View className="gap-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-title font-bold text-ink">Weekly Availability Grid</Text>
          <Text className="text-caption font-semibold text-mint-dark">
            {freeCount} Free · {busyCount} Busy slots chosen
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          className="border border-line rounded-2xl bg-surface p-3"
        >
          <View>
            {/* Header row */}
            <View className="flex-row border-b border-line pb-2">
              <View className="w-16 items-center justify-center">
                <Text className="text-caption font-bold text-ink-faint">TIME</Text>
              </View>
              {DAYS.map((day, dIdx) => (
                <View key={dIdx} className="w-24 items-center justify-center">
                  <Text className="text-label font-bold text-ink">{day}</Text>
                </View>
              ))}
            </View>

            {/* Grid rows */}
            {HOURS.map((hour) => (
              <View key={hour} className="flex-row border-b border-line-soft items-center">
                <View className="w-16 py-3 items-center justify-center">
                  <Text className="text-num-sm font-semibold text-ink-faint">{hour}</Text>
                </View>
                {DAYS.map((_, dayIdx) => {
                  const key = `${dayIdx}-${hour}`;
                  const myVal = mySlots[key];
                  const slot = INITIAL_SLOTS.find(
                    (s) => s.dayIndex === dayIdx && s.hour === hour
                  ) || { dayIndex: dayIdx, hour, free: 0, total: 8, step: 0 };

                  const isUSOS =
                    (dayIdx === 5 && hour === "11:00") ||
                    (dayIdx === 6 && (hour === "10:00" || hour === "10:30"));

                  const step = STEPS[slot.step];

                  return (
                    <Pressable
                      key={dayIdx}
                      onPress={() => handleCellPress(slot)}
                      {...({ onDoubleClick: () => setPopupSlot(slot) } as any)}
                      className={`w-24 h-11 items-center justify-center m-0.5 rounded-sm relative overflow-hidden ${
                        isUSOS
                          ? "bg-imported"
                          : `${step.fill} ${step.text}`
                      }`}
                      style={{
                        borderWidth: myVal === "free" && !isUSOS ? 2 : 1,
                        borderColor:
                          isUSOS
                            ? "#C8CDC6"
                            : myVal === "free"
                              ? "#205E46"
                              : step.line,
                      }}
                    >
                      {isUSOS ? (
                        <View className="flex-row items-center gap-1">
                          <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"
                              fill="#55645C"
                            />
                          </Svg>
                          <Text className="text-num-sm font-medium text-imported-ink">USOS</Text>
                        </View>
                      ) : myVal === "busy" ? (
                        // Busy: the ramp stays visible underneath, numbers go away.
                        <HatchPattern color={step.hatch} opacity={step.hatchOpacity} />
                      ) : (
                        <View className="flex-row items-baseline">
                          <Text className="text-num font-semibold" style={styles.tabular}>
                            {slot.free}
                          </Text>
                          <Text className="text-num-sm" style={styles.tabular}>
                            /{slot.total}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Floating Submit Bar */}
      <View className="rounded-2xl bg-surface p-4 border border-line flex-row items-center justify-between shadow-sm">
        <View>
          <Text className="text-body font-bold text-ink">
            {submitted ? "✓ Availability Saved!" : `${userName}: ${freeCount} slots selected`}
          </Text>
          <Text className="text-caption text-ink-muted">
            Double-click any cell anytime to view who is free/busy.
          </Text>
        </View>
        <Pressable
          onPress={() => setSubmitted(true)}
          className="rounded-xl bg-mint-deep px-6 py-2.5 active:bg-mint-dark shadow-sm"
        >
          <Text className="text-body font-bold text-paper">
            {submitted ? "Update Answer" : "Submit Answer"}
          </Text>
        </Pressable>
      </View>

      {/* Pop-up Modal triggered by double-click */}
      <SlotDetailsModal slot={popupSlot} onClose={() => setPopupSlot(null)} />
    </ScrollView>
  );
}

// -------------------------------------------------------------
// VARIANT B: Finalize & Mock Month Calendar View
// -------------------------------------------------------------
const CALENDAR_DAYS_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MonthDay = {
  dayNum: number;
  month: "prev" | "current" | "next";
  isEventWeek?: boolean;
  isLockedDate?: boolean;
};

const MARCH_2026_DAYS: MonthDay[] = [
  // Trailing Feb
  { dayNum: 23, month: "prev" },
  { dayNum: 24, month: "prev" },
  { dayNum: 25, month: "prev" },
  { dayNum: 26, month: "prev" },
  { dayNum: 27, month: "prev" },
  { dayNum: 28, month: "prev" },
  { dayNum: 1, month: "current" },
  // Week 1
  { dayNum: 2, month: "current" },
  { dayNum: 3, month: "current" },
  { dayNum: 4, month: "current" },
  { dayNum: 5, month: "current" },
  { dayNum: 6, month: "current" },
  { dayNum: 7, month: "current" },
  { dayNum: 8, month: "current" },
  // Week 2
  { dayNum: 9, month: "current" },
  { dayNum: 10, month: "current" },
  { dayNum: 11, month: "current" },
  { dayNum: 12, month: "current", isEventWeek: true },
  { dayNum: 13, month: "current", isEventWeek: true },
  { dayNum: 14, month: "current", isEventWeek: true, isLockedDate: true },
  { dayNum: 15, month: "current", isEventWeek: true },
  // Week 3
  { dayNum: 16, month: "current", isEventWeek: true },
  { dayNum: 17, month: "current", isEventWeek: true },
  { dayNum: 18, month: "current", isEventWeek: true },
  { dayNum: 19, month: "current" },
  { dayNum: 20, month: "current" },
  { dayNum: 21, month: "current" },
  { dayNum: 22, month: "current" },
  // Week 4
  { dayNum: 23, month: "current" },
  { dayNum: 24, month: "current" },
  { dayNum: 25, month: "current" },
  { dayNum: 26, month: "current" },
  { dayNum: 27, month: "current" },
  { dayNum: 28, month: "current" },
  { dayNum: 29, month: "current" },
  // Week 5
  { dayNum: 30, month: "current" },
  { dayNum: 31, month: "current" },
  { dayNum: 1, month: "next" },
  { dayNum: 2, month: "next" },
  { dayNum: 3, month: "next" },
  { dayNum: 4, month: "next" },
  { dayNum: 5, month: "next" },
];

function VariantB() {
  const [selectedDay, setSelectedDay] = useState<number>(14);
  const [monthName] = useState("March 2026");
  const [copiedLink, setCopiedLink] = useState(false);

  const isFinalized = selectedDay === 14;

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={styles.scroll}>
      {/* Top Header Card */}
      <View className="rounded-2xl bg-surface p-5 border border-line gap-4 shadow-sm">
        <View className="flex-row items-start justify-between">
          <View className="gap-1 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-display font-bold text-ink">BIT Web Recruitment</Text>
              <View className="rounded-pill bg-mint-light px-3.5 py-1 border border-mint-soft">
                <Text className="text-caption font-bold text-mint-dark">✓ Finalized</Text>
              </View>
            </View>
            <Text className="text-body text-ink-muted">
              Organized by Anya (Host) · 8 of 12 members confirmed
            </Text>
          </View>
        </View>
      </View>

      {/* Mock Month Calendar with Mint & Blush */}
      <View className="rounded-2xl bg-surface p-5 border border-line gap-4 shadow-sm">
        {/* Month Calendar Header */}
        <View className="flex-row items-center justify-between border-b border-line-soft pb-3">
          <View>
            <Text className="text-title font-bold text-ink">{monthName}</Text>
            <Text className="text-caption text-ink-muted">
              Event window: March 12 – 18 · Finalized on March 14
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Pressable className="h-8 w-8 rounded-lg bg-mint-light border border-mint-soft items-center justify-center active:bg-mint-soft">
              <Text className="text-mint-dark font-bold">‹</Text>
            </Pressable>
            <Pressable className="h-8 w-8 rounded-lg bg-mint-light border border-mint-soft items-center justify-center active:bg-mint-soft">
              <Text className="text-mint-dark font-bold">›</Text>
            </Pressable>
          </View>
        </View>

        {/* Days of week header */}
        <View className="flex-row">
          {CALENDAR_DAYS_HEADER.map((col, idx) => (
            <View key={idx} className="flex-1 items-center py-1">
              <Text className="text-caption font-bold text-ink-muted">{col}</Text>
            </View>
          ))}
        </View>

        {/* Month grid (7x5) */}
        <View className="flex-row flex-wrap">
          {MARCH_2026_DAYS.map((d, index) => {
            const isSelected = d.month === "current" && d.dayNum === selectedDay;
            const isLocked = d.isLockedDate;
            const isWindow = d.isEventWeek;
            const isCurrentMonth = d.month === "current";

            return (
              <Pressable
                key={index}
                onPress={() => {
                  if (isCurrentMonth) {
                    setSelectedDay(d.dayNum);
                  }
                }}
                className={`h-11 items-center justify-center rounded-xl m-0.5 relative ${
                  !isCurrentMonth
                    ? "opacity-30"
                    : isLocked
                    ? "bg-mint-deep shadow-sm"
                    : isSelected
                    ? "bg-mint-light border-2 border-mint-deep"
                    : isWindow
                    ? "bg-mint-light border border-mint-soft"
                    : "border border-transparent"
                }`}
                style={{ width: "13.2%" }}
              >
                <Text
                  className={`text-body font-bold ${
                    isLocked
                      ? "text-paper"
                      : isSelected
                      ? "text-mint-dark font-bold"
                      : isCurrentMonth
                      ? "text-ink"
                      : "text-ink-faint"
                  }`}
                >
                  {d.dayNum}
                </Text>

                {isLocked ? (
                  <View className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-paper" />
                ) : isWindow ? (
                  <View className="absolute bottom-1 h-1 w-1 rounded-full bg-mint-deep" />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Calendar Legend */}
        <View className="flex-row flex-wrap gap-4 pt-2 border-t border-line-soft">
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full bg-mint-deep" />
            <Text className="text-caption font-semibold text-mint-dark">Finalized Meeting Date (Mar 14)</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded bg-mint-light border border-mint-soft" />
            <Text className="text-caption text-ink-muted font-medium">Event Poll Range (Mar 12–18)</Text>
          </View>
        </View>
      </View>

      {/* Finalized Event Details & Export Actions */}
      <View className="rounded-2xl bg-surface p-5 border border-line gap-4 shadow-sm">
        <View className="border-b border-line-soft pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption font-bold text-mint-dark uppercase tracking-wider">
              {isFinalized ? "Finalized Meeting Time" : `Selected Date: March ${selectedDay}, 2026`}
            </Text>
            {isFinalized && (
              <View className="rounded-pill bg-mint-light px-3 py-0.5 border border-mint-soft">
                <Text className="text-caption font-bold text-mint-dark">✓ 100% Group Fit</Text>
              </View>
            )}
          </View>
          <Text className="text-title font-bold text-ink mt-1">
            Wednesday, March 14, 2026 · 10:00 – 11:30 CET
          </Text>
          <Text className="text-body text-ink-muted mt-0.5">
            Location: Room 3.14 (Faculty CS) + Google Meet
          </Text>
        </View>

        {/* Calendar Export Buttons in Mint & Blush */}
        <View className="gap-2.5">
          <Text className="text-label font-bold text-ink">Add to Calendar:</Text>
          <View className="flex-row flex-wrap gap-2.5">
            <Pressable className="flex-1 min-w-[160px] rounded-xl bg-mint-deep p-3 items-center justify-center active:bg-mint-dark shadow-sm">
              <Text className="text-body font-bold text-paper">📥 Download .ics File</Text>
            </Pressable>

            <Pressable className="flex-1 min-w-[160px] rounded-xl bg-surface border border-line-strong p-3 items-center justify-center active:bg-surface-subtle">
              <Text className="text-body font-bold text-ink">📅 Google Calendar</Text>
            </Pressable>

            <Pressable className="flex-1 min-w-[160px] rounded-xl bg-surface border border-line-strong p-3 items-center justify-center active:bg-surface-subtle">
              <Text className="text-body font-bold text-ink">🍏 Apple Calendar</Text>
            </Pressable>
          </View>
        </View>

        {/* Attendees Confirmation List */}
        <View className="gap-3 pt-2 border-t border-line-soft">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-mint-deep" />
              <Text className="text-body font-bold text-mint-dark">
                Confirmed Attending (8 of 12):
              </Text>
            </View>
            <Text className="text-body text-ink-muted pl-4">
              Anya (Host), Boris, Vera, Gosha, Dasha, Egor, Zhenya, Zina
            </Text>
          </View>

          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-blush-deep" />
              <Text className="text-body font-bold text-blush-deep">
                Declined / Schedule Conflict (4):
              </Text>
            </View>
            <Text className="text-body text-ink-muted pl-4">
              Igor (USOS: Physics Lab), Kate, Leo, Maria
            </Text>
          </View>
        </View>

        {/* Share Finalized Link */}
        <View className="rounded-xl bg-surface-subtle p-3 border border-line-soft flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-caption text-ink-muted">Meeting invite link:</Text>
            <Text className="text-caption font-mono font-bold text-ink truncate">
              meetbit.app/e/bit-web-recruitment-final
            </Text>
          </View>
          <Pressable
            onPress={() => setCopiedLink(true)}
            className="rounded-lg bg-mint-light px-3.5 py-1.5 border border-mint-soft active:bg-mint-soft"
          >
            <Text className="text-caption font-bold text-mint-dark">
              {copiedLink ? "✓ Copied" : "Copy Link"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// -------------------------------------------------------------
// MAIN PROTOTYPE ROUTE WITH 2-TAB SWITCHER
// -------------------------------------------------------------
export default function FlowPrototypeScreen() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const variant = params.variant ?? "A";

  return (
    <View className="flex-1 bg-canvas">
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}

      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        pathname="/prototype/flow"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 24, paddingBottom: 110 },
  tabular: { fontVariant: ["tabular-nums"] },
});
