import { useRef, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";

const ROW_HEIGHT = 48;
const COLUMNS = 7;
const ROWS = 8;

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Cell = { row: number; column: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cellAt(point: Point, size: Size): Cell {
  const cellWidth = size.width / COLUMNS;
  const cellHeight = size.height / ROWS;

  return {
    column: clamp(Math.floor(point.x / cellWidth), 0, COLUMNS - 1),
    row: clamp(Math.floor(point.y / cellHeight), 0, ROWS - 1),
  };
}

function keyOf(cell: Cell) {
  return `${cell.row}:${cell.column}`;
}

export default function GridPrototypeScreen() {
  const [size, setSize] = useState<Size | null>(null);
  const [painted, setPainted] = useState<Set<string>>(() => new Set());

  const modeRef = useRef<"paint" | "erase">("paint");
  const lastKeyRef = useRef<string | null>(null);

  const [armed, setArmed] = useState(false);
  const startCellRef = useRef<Cell | null>(null);

  function applyCell(cell: Cell) {
    const key = keyOf(cell);

    if (key === lastKeyRef.current) {
      return;
    }

    lastKeyRef.current = key;

    setPainted((prev) => {
      const shouldPaint = modeRef.current === "paint";

      if (prev.has(key) === shouldPaint) {
        return prev;
      }

      const next = new Set(prev);
      if (shouldPaint) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  const pan = usePanGesture({
    disableReanimated: true,
    activateAfterLongPress: 100,
    onBegin: (event) => {
      if (!size) return;

      const cell = cellAt(event, size);

      startCellRef.current = cell;
      modeRef.current = painted.has(keyOf(cell)) ? "erase" : "paint";
      lastKeyRef.current = null;
    },
    onActivate: () => {
      const cell = startCellRef.current;
      if (!cell) return;

      setArmed(true);
      applyCell(cell);
    },
    onUpdate: (event) => {
      if (!size) return;

      applyCell(cellAt(event, size));
    },
    onFinalize: () => {
      startCellRef.current = null;
      lastKeyRef.current = null;
      setArmed(false);
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.readout}>
        {armed ? "armed — painting" : "hold to paint"}
      </Text>

      <ScrollView contentContainerStyle={styles.content}>
        <GestureDetector gesture={pan}>
          <View
            style={styles.grid}
            onLayout={(event) => setSize(event.nativeEvent.layout)}
          >
            {Array.from({ length: ROWS }, (_, row) => (
              <View key={row} style={styles.row}>
                {Array.from({ length: COLUMNS }, (_, column) => (
                  <View
                    key={column}
                    style={[
                      styles.cell,
                      painted.has(keyOf({ row, column })) && styles.cellPainted,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </GestureDetector>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  readout: { fontSize: 16, fontVariant: ["tabular-nums"] },
  grid: {
    height: ROWS * ROW_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  row: { height: ROW_HEIGHT, flexDirection: "row" },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    backgroundColor: "#fff",
  },
  cellPainted: { backgroundColor: "#2563eb" },
  content: { paddingBottom: 24 },
});
