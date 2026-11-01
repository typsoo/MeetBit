import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

/**
 * The palette as it is actually used, not as a swatch sheet.
 *
 * Four bands share two hues. The point of the page is that bands must never
 * swap: a data colour never leaves the grid, a UI tint never becomes a step.
 */

const CELL_WIDTH = 140;
const CELL_HEIGHT = 56;
const HATCH_SPACING = 8;

type Step = 0 | 1 | 2 | 3 | 4;

/**
 * Ramp steps. `line` is the fill mixed with 14% ink (22% paper on the darkest
 * step), so the grid stays visible without a second, unrelated grey.
 */
const STEPS: Record<
  Step,
  { fill: string; text: string; line: string; hatch: string; hatchOpacity: number }
> = {
  0: { fill: "bg-busy", text: "text-busy-ink", line: "#DFAF97", hatch: "#162620", hatchOpacity: 0.45 },
  1: { fill: "bg-free-1", text: "text-ink", line: "#A5D5BA", hatch: "#162620", hatchOpacity: 0.45 },
  2: { fill: "bg-free-2", text: "text-ink", line: "#7FC7A3", hatch: "#162620", hatchOpacity: 0.45 },
  3: { fill: "bg-free-3", text: "text-ink", line: "#56B189", hatch: "#162620", hatchOpacity: 0.45 },
  4: { fill: "bg-free-4", text: "text-paper", line: "#569A80", hatch: "#FFFFFF", hatchOpacity: 0.7 },
};

function Hatch({ color, opacity }: { color: string; opacity: number }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  if (!size) {
    return (
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      />
    );
  }

  const lines = [];
  for (let x = -size.height; x < size.width; x += HATCH_SPACING) {
    lines.push(
      <Line
        key={x}
        x1={x}
        y1={size.height}
        x2={x + size.height}
        y2={0}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1}
      />,
    );
  }

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
      {lines}
    </Svg>
  );
}

type CellProps = {
  step: Step;
  free?: number;
  total?: number;
  mineFree?: boolean;
  mineBusy?: boolean;
  imported?: boolean;
  width?: number;
};

/**
 * One availability cell. The rule it encodes:
 * - fill is always the group ramp, so the reading never disappears;
 * - numbers only on cells where I am not busy;
 * - my free choice is an outline, my busy choice is a hatch.
 */
function Cell({ step, free, total, mineFree, mineBusy, imported, width = CELL_WIDTH }: CellProps) {
  const style = STEPS[step];
  const showNumbers = !mineBusy && !imported;

  return (
    <View
      className={`${imported ? "bg-imported text-imported-ink" : `${style.fill} ${style.text}`} items-center justify-center`}
      style={{
        width,
        height: CELL_HEIGHT,
        borderWidth: mineFree ? 2 : 1,
        borderColor: mineFree ? "#205E46" : imported ? "#C8CDC6" : style.line,
        overflow: "hidden",
      }}
    >
      {mineBusy ? <Hatch color={style.hatch} opacity={style.hatchOpacity} /> : null}

      {imported ? (
        <View className="flex-row items-center gap-1">
          <Svg width={10} height={10} viewBox="0 0 24 24">
            <Path
              d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"
              fill="#55645C"
            />
          </Svg>
          <Text className="text-num-sm text-imported-ink">USOS</Text>
        </View>
      ) : null}

      {showNumbers ? (
        <View className="flex-row items-baseline">
          <Text className="text-num font-semibold" style={styles.tabular}>
            {free}
          </Text>
          <Text className="text-num-sm" style={styles.tabular}>
            /{total}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-title font-bold text-ink">{title}</Text>
      {note ? <Text className="text-label text-ink-muted">{note}</Text> : null}
      {children}
    </View>
  );
}

function Swatch({
  name,
  className,
  hex,
  on,
}: {
  name: string;
  className: string;
  hex: string;
  on: string;
}) {
  return (
    <View className="flex-1 min-w-[150px] gap-1">
      <View className={`h-12 rounded-md ${className}`} style={styles.hairline} />
      <Text className="text-label font-semibold text-ink">{name}</Text>
      <Text className="text-caption text-ink-muted">{hex}</Text>
      <Text className="text-caption text-ink-faint">{on}</Text>
    </View>
  );
}

function Button({
  label,
  variant = "primary",
  disabled,
}: {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <View className="rounded-md bg-surface-subtle px-4 py-3" style={styles.hairline}>
        <Text className="text-body font-semibold text-disabled">{label}</Text>
      </View>
    );
  }

  if (variant === "primary") {
    return (
      <View className="rounded-md bg-mint-deep px-4 py-3">
        <Text className="text-body font-semibold text-paper">{label}</Text>
      </View>
    );
  }

  if (variant === "secondary") {
    return (
      <View className="rounded-md bg-surface px-4 py-3" style={styles.hairline}>
        <Text className="text-body font-semibold text-ink">{label}</Text>
      </View>
    );
  }

  return (
    <View className="px-4 py-3">
      <Text className="text-body font-semibold text-mint-deep">{label}</Text>
    </View>
  );
}

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "good" | "attention";
}) {
  if (tone === "good") {
    return (
      <View className="self-start rounded-pill border border-mint-soft bg-mint-light px-3 py-1">
        <Text className="text-label font-semibold text-mint-dark">{label}</Text>
      </View>
    );
  }

  if (tone === "attention") {
    return (
      <View className="self-start rounded-pill border border-blush-soft bg-blush-light px-3 py-1">
        <Text className="text-label font-semibold text-blush-deep">{label}</Text>
      </View>
    );
  }

  return (
    <View className="self-start rounded-pill border border-line-soft bg-surface-subtle px-3 py-1">
      <Text className="text-label font-semibold text-ink-muted">{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  helper,
  state = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  state?: "default" | "focus" | "error" | "disabled";
}) {
  const border =
    state === "focus"
      ? "border-mint-deep"
      : state === "error"
        ? "border-blush-deep"
        : "border-line-strong";

  return (
    <View className="gap-1.5">
      <Text className="text-label font-semibold text-ink">{label}</Text>
      <View
        className={`rounded-md bg-surface px-3 py-2.5 border ${border}`}
        style={state === "disabled" ? styles.disabledFill : undefined}
      >
        <Text className={`text-body ${state === "disabled" ? "text-disabled" : "text-ink"}`}>
          {value}
        </Text>
      </View>
      {helper ? (
        <Text
          className={`text-caption ${state === "error" ? "text-blush-deep" : "text-ink-muted"}`}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export default function PalettePrototypeScreen() {
  const [name, setName] = useState("Alex Kowalski");
  const [focused, setFocused] = useState(false);
  const [checked, setChecked] = useState(true);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={styles.content}>
      <Text className="text-display font-bold text-ink">Palette &amp; UI kit</Text>
      <Text className="text-body text-ink-muted">
        Two hues, four bands. Mint does the work, peach appears only where something needs
        attention, and the data ramp lives inside the grid and nowhere else.
      </Text>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Four bands"
        note="The only rule that keeps a two-hue app readable: bands never swap roles."
      >
        <View style={styles.hairline} className="overflow-hidden rounded-md">
          <View className="flex-row">
            <View className="flex-1 gap-1 bg-canvas px-3 py-4">
              <Text className="text-caption font-bold text-ink-muted">1 · NEUTRALS</Text>
              <Text className="text-caption text-ink-faint">canvas · surface · line · ink</Text>
            </View>
            <View className="flex-1 gap-1 bg-mint-light px-3 py-4">
              <Text className="text-caption font-bold text-mint-dark">2 · UI TINTS</Text>
              <Text className="text-caption text-mint-deep">badges · tabs · rows</Text>
            </View>
            <View className="flex-1 gap-1 bg-mint-deep px-3 py-4">
              <Text className="text-caption font-bold text-paper">3 · UI SOLID</Text>
              <Text className="text-caption text-mint-soft">actions · focus</Text>
            </View>
            <View className="flex-1 gap-1 bg-free-3 px-3 py-4">
              <Text className="text-caption font-bold text-ink">4 · DATA</Text>
              <Text className="text-caption text-ink">grid only</Text>
            </View>
          </View>
        </View>
        <Text className="text-caption text-ink-muted">
          The page is a near-white with a mint undertone (#F7F9F7) and the text is a deep pine (#162620). Cards stay
          light on purpose: every data cell lives on `surface`, never on the page.
        </Text>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Type scale" note="Eight sizes, no arbitrary values.">
        <View className="gap-3 rounded-lg bg-surface p-4" style={styles.hairline}>
          <View className="gap-0.5">
            <Text className="text-display font-bold text-ink">Display 28</Text>
            <Text className="text-caption text-ink-faint">screen title, once per screen</Text>
          </View>
          <View className="gap-0.5">
            <Text className="text-title font-bold text-ink">Title 20 — section heading</Text>
            <Text className="text-caption text-ink-faint">sections, card headers</Text>
          </View>
          <View className="gap-0.5">
            <Text className="text-subtitle text-ink">Subtitle 17 — event name in a list</Text>
            <Text className="text-caption text-ink-faint">list items, dialog titles</Text>
          </View>
          <View className="gap-0.5">
            <Text className="text-body text-ink">
              Body 15 — the default sentence, used for descriptions and names.
            </Text>
            <Text className="text-caption text-ink-faint">everything readable</Text>
          </View>
          <View className="gap-0.5">
            <Text className="text-label font-semibold text-ink">Label 13 — button, tab, field</Text>
            <Text className="text-caption text-ink-faint">controls</Text>
          </View>
          <View className="gap-0.5">
            <Text className="text-caption text-ink-muted">
              CAPTION 11 — TIMESTAMPS, COUNTERS, HINTS
            </Text>
            <Text className="text-caption text-ink-faint">secondary information only</Text>
          </View>
          <View className="flex-row items-baseline gap-2">
            <Text className="text-num font-semibold text-ink" style={styles.tabular}>
              5
            </Text>
            <Text className="text-num-sm text-ink" style={styles.tabular}>
              /8
            </Text>
            <Text className="text-caption text-ink-faint">num 12/9 — inside a grid cell</Text>
          </View>
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Neutrals" note="Band 1. Tinted, never pure grey.">
        <View className="flex-row flex-wrap gap-4 rounded-lg bg-surface p-4" style={styles.hairline}>
          <Swatch name="canvas" className="bg-canvas" hex="#F7F9F7" on="page, 14.9:1 with ink" />
          <Swatch name="surface" className="bg-surface" hex="#FFFFFF" on="cards" />
          <Swatch name="surface-subtle" className="bg-surface-subtle" hex="#F0F5F2" on="wells, chips" />
          <Swatch name="line" className="bg-line" hex="#D4E2D8" on="dividers" />
          <Swatch name="line-strong" className="bg-line-strong" hex="#768C81" on="controls 3.6:1" />
          <Swatch name="ink" className="bg-ink" hex="#162620" on="text 14.9:1" />
          <Swatch name="ink-muted" className="bg-ink-muted" hex="#4E6359" on="6.1:1" />
          <Swatch name="ink-faint" className="bg-ink-faint" hex="#768C81" on="3.4:1" />
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Mint: two bands, one hue"
        note="Light tints are shapes, not signals: on a light page they need a hairline to exist."
      >
        <View className="flex-row flex-wrap gap-4 rounded-lg bg-surface p-4" style={styles.hairline}>
          <Swatch name="mint-light" className="bg-mint-light" hex="#E8F7F0" on="badges" />
          <Swatch name="mint-soft" className="bg-mint-soft" hex="#C8F0DC" on="borders of tints" />
          <Swatch name="mint" className="bg-mint" hex="#7FE0B8" on="data-adjacent only" />
          <Swatch name="mint-deep" className="bg-mint-deep" hex="#205E46" on="actions 7.6:1" />
          <Swatch name="mint-dark" className="bg-mint-dark" hex="#133A2B" on="text on tint 11.4:1" />
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Peach: 5% of the screen"
        note="Attention only. If it grows past that, it stops being a signal."
      >
        <View className="flex-row flex-wrap gap-4 rounded-lg bg-surface p-4" style={styles.hairline}>
          <Swatch name="blush-light" className="bg-blush-light" hex="#FFF1EB" on="negative chip" />
          <Swatch name="blush-soft" className="bg-blush-soft" hex="#FED9CC" on="its border" />
          <Swatch name="blush" className="bg-blush" hex="#FFC5AA" on="0% free cell" />
          <Swatch name="blush-deep" className="bg-blush-deep" hex="#8A3928" on="text 7.8:1" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Declined" tone="attention" />
          <Badge label="USOS conflict · Physics Lab" tone="attention" />
          <Badge label="8 of 12 responded" tone="good" />
          <Badge label="30 min · 8 slots" />
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Buttons" note="Primary is the only solid mint on a screen.">
        <View className="gap-3 rounded-lg bg-surface p-4" style={styles.hairline}>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button label="Book this time" />
            <Button label="Copy link" variant="secondary" />
            <Button label="Cancel" variant="ghost" />
            <Button label="Book this time" disabled />
          </View>
          <View className="flex-row flex-wrap items-center gap-2 pt-2" style={styles.topLine}>
            <View className="rounded-md bg-mint-deep px-4 py-3">
              <Text className="text-body font-semibold text-paper">Default</Text>
            </View>
            <View className="rounded-md bg-mint-dark px-4 py-3">
              <Text className="text-body font-semibold text-paper">Pressed</Text>
            </View>
            <View className="rounded-md bg-surface px-4 py-3" style={styles.hairline}>
              <Text className="text-body font-semibold text-ink">Secondary</Text>
            </View>
          </View>
          <Text className="text-caption text-ink-muted">
            Pressed is mint-dark (#133A2B). Never a ramp step: `free-4` is data and reads as a
            heatmap when it sits under a label.
          </Text>
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Fields"
        note="Controls use line-strong (3.6:1); decorative dividers use line (1.2:1)."
      >
        <View className="gap-4 rounded-lg bg-surface p-4" style={styles.hairline}>
          <View className="gap-1.5">
            <Text className="text-label font-semibold text-ink">Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter your name"
              placeholderTextColor="#768C81"
              className={`rounded-md bg-surface px-3 py-2.5 text-body text-ink border ${
                focused ? "border-mint-deep" : "border-line-strong"
              }`}
            />
            <Text className="text-caption text-ink-muted">
              {focused ? "Focused: 2px mint-deep" : "Default: 1px line-strong"}
            </Text>
          </View>

          <Field label="Email" value="alex@example.com" helper="Used for reminders only." />
          <Field
            label="iCal link"
            value="https://usos.example/ical/abc"
            state="error"
            helper="This link is not a public calendar."
          />

          <View className="flex-row items-center justify-between gap-4 pt-2" style={styles.topLine}>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-5 w-5 items-center justify-center rounded ${
                  checked ? "bg-mint-deep" : "border border-line-strong bg-surface"
                }`}
              >
                {checked ? <Text className="text-caption font-bold text-paper">✓</Text> : null}
              </View>
              <Text className="text-body text-ink">Block lectures from USOS</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-5 w-5 items-center justify-center rounded bg-surface-subtle" />
              <Text className="text-body text-disabled">Import off</Text>
            </View>
          </View>
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Selection" note="Active tabs and rows are tint plus dark mint text.">
        <View className="gap-3 rounded-lg bg-surface p-4" style={styles.hairline}>
          <View className="flex-row rounded-md bg-surface-subtle p-1">
            <View className="flex-1 items-center rounded-sm bg-surface py-2" style={styles.hairline}>
              <Text className="text-label font-semibold text-ink">Week</Text>
            </View>
            <View className="flex-1 items-center rounded-sm bg-mint-light py-2">
              <Text className="text-label font-semibold text-mint-dark">Month</Text>
            </View>
            <View className="flex-1 items-center rounded-sm py-2">
              <Text className="text-label font-semibold text-ink-faint">List</Text>
            </View>
          </View>

          <View className="overflow-hidden rounded-md" style={styles.hairline}>
            <View className="flex-row items-center justify-between bg-mint-light px-3 py-3">
              <Text className="text-body font-semibold text-mint-dark">Wed 14 · 10:00</Text>
              <Text className="text-label text-mint-deep">8 free</Text>
            </View>
            <View className="flex-row items-center justify-between px-3 py-3" style={styles.topLine}>
              <Text className="text-body text-ink">Wed 14 · 10:30</Text>
              <Text className="text-label text-ink-muted">6 free</Text>
            </View>
            <View className="flex-row items-center justify-between px-3 py-3" style={styles.topLine}>
              <Text className="text-body text-ink">Wed 14 · 11:00</Text>
              <Text className="text-label text-ink-muted">2 free</Text>
            </View>
          </View>
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Data: the ramp"
        note="Band 4. Fill is the group's availability; my own answer is an outline or a hatch on top."
      >
        <View style={styles.row}>
          <Cell step={0} free={0} total={8} />
          <Cell step={1} free={2} total={8} />
          <Cell step={2} free={4} total={8} />
          <Cell step={3} free={6} total={8} />
          <Cell step={4} free={8} total={8} />
        </View>
        <Text className="text-caption text-ink-muted">
          0% · 1–33% · 34–66% · 67–99% · 100%. Steps are 7.6 / 9.9 / 25.7 L* apart — that is the
          minimum that survives a phone in daylight.
        </Text>

        <View style={styles.row}>
          <View className="items-center gap-1">
            <Cell step={2} free={4} total={8} mineFree />
            <Text className="text-caption text-ink-muted">I'm free</Text>
          </View>
          <View className="items-center gap-1">
            <Cell step={2} mineBusy />
            <Text className="text-caption text-ink-muted">I'm busy</Text>
          </View>
          <View className="items-center gap-1">
            <Cell step={4} mineBusy />
            <Text className="text-caption text-ink-muted">busy on dark</Text>
          </View>
          <View className="items-center gap-1">
            <Cell step={1} imported />
            <Text className="text-caption text-ink-muted">USOS import</Text>
          </View>
        </View>
        <Text className="text-caption text-ink-muted">
          Numbers disappear under the hatch: there is nobody to count there. The hatch colour
          follows the step — ink on light fills, white on the darkest one.
        </Text>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Card and participants" note="How a screen is assembled from the bands.">
        <View className="gap-4 rounded-lg bg-surface p-4" style={styles.hairline}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-title font-bold text-ink">BIT Web Recruitment</Text>
              <Text className="text-body text-ink-muted">March 12 – 18 · 30-min intervals</Text>
            </View>
            <Badge label="8 of 12 responded" tone="good" />
          </View>

          <View className="gap-2 pt-3" style={styles.topLine}>
            <Text className="text-label font-bold text-ink">Wednesday, March 14 · 10:00</Text>
            <View className="flex-row gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-success" style={styles.dotOffset} />
              <View className="flex-1">
                <Text className="text-body font-semibold text-ink">Free (5)</Text>
                <Text className="text-body text-ink-muted">Anya, Boris, Vera, Gosha, Dasha</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-danger" style={styles.dotOffset} />
              <View className="flex-1">
                <Text className="text-body font-semibold text-ink">Busy (3)</Text>
                <Text className="text-body text-ink-muted">
                  Egor <Text className="text-caption text-imported-ink">(USOS: Physics Lab)</Text>
                  , Zhenya, Zina
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-ink-faint" style={styles.dotOffset} />
              <View className="flex-1">
                <Text className="text-body font-semibold text-ink">Not answered (4)</Text>
                <Text className="text-body text-ink-muted">
                  Igor, Kate, Leo, Maria — not counted in the ratio
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-caption text-ink-faint">
            No amber anywhere: "not answered" is neutral, not a warning.
          </Text>
        </View>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Overlay" note="Scrim is tinted ink, buttons inside follow the same rules.">
        <View className="overflow-hidden rounded-lg" style={styles.hairline}>
          <View className="items-center justify-center bg-scrim p-6">
            <View className="w-full gap-3 rounded-lg bg-surface p-4">
              <Text className="text-title font-bold text-ink">Cancel this event?</Text>
              <Text className="text-body text-ink-muted">
                All 12 participants will be notified. Answers cannot be restored.
              </Text>
              <View className="flex-row justify-end gap-2 pt-1">
                <Button label="Keep" variant="secondary" />
                <View className="rounded-md bg-blush-deep px-4 py-3">
                  <Text className="text-body font-semibold text-paper">Cancel event</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <Text className="text-caption text-ink-muted">
          Destructive actions are the one place a peach solid is allowed: it is the only thing on
          the screen that can lose data.
        </Text>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Checks" note="Measured, not eyeballed. AA is 4.5 for text, 3.0 for marks.">
        <View className="overflow-hidden rounded-lg bg-surface" style={styles.hairline}>
          {[
            ["ink on canvas", "14.90", "4.5"],
            ["ink-muted on canvas", "6.10", "4.5"],
            ["ink-faint on canvas", "3.40", "3.0"],
            ["ink on free-1", "12.48", "4.5"],
            ["ink on free-2", "10.15", "4.5"],
            ["ink on free-3", "7.60", "4.5"],
            ["paper on free-4", "4.88", "4.5"],
            ["busy-ink on busy", "5.12", "4.5"],
            ["imported-ink on imported", "5.16", "4.5"],
            ["mint-dark on mint-light", "11.39", "4.5"],
            ["paper on mint-deep", "7.63", "4.5"],
            ["blush-deep on blush", "5.12", "4.5"],
            ["paper on blush-deep", "7.79", "4.5"],
            ["line-strong on surface", "3.60", "3.0"],
          ].map(([pair, value, min]) => (
            <View key={pair} className="flex-row justify-between px-3 py-2" style={styles.topLine}>
              <Text className="text-label text-ink">{pair}</Text>
              <View className="flex-row gap-3">
                <Text className="text-label text-ink-muted" style={styles.tabular}>
                  {value}
                </Text>
                <Text className="text-caption text-ink-faint" style={styles.tabular}>
                  min {min}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 28, paddingBottom: 56 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // 1px outline so white surfaces stay visible on the tinted canvas.
  hairline: { borderWidth: 1, borderColor: "#E6EFEA" },
  topLine: { borderTopWidth: 1, borderTopColor: "#E6EFEA" },
  // Numbers must not jitter as they change, otherwise the grid dances.
  tabular: { fontVariant: ["tabular-nums"] },
  disabledFill: { backgroundColor: "#F0F5F2" },
  dotOffset: { marginTop: 7 },
});
