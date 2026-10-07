// Default colors handed to new subjects, in this order. Same categorical
// palette as the charts, so neighbouring classes stay easy to tell apart.
export const SUBJECT_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

// The first palette color no subject uses yet (cycles once all are taken).
export function nextSubjectColor(used: string[]) {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  return (
    SUBJECT_COLORS.find((c) => !taken.has(c)) ?? SUBJECT_COLORS[used.length % SUBJECT_COLORS.length]
  );
}
