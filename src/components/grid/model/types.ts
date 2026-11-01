export type Point = { x: number; y: number };

/** One cell of the grid: an event day and a slot inside working hours. */
export type Cell = { date: string; slot: number };

/** Measured cell size; the same for every cell of the grid. */
export type Metrics = { cellWidth: number; cellHeight: number };

/** Who is free and who is busy on one slot (aggregate.heatmap, ticket 11). */
export type SlotInfo = { free: string[]; busy: string[] };
