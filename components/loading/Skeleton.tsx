// Minimal shared building block for route-level loading.tsx skeletons —
// a single div with Tailwind's built-in `animate-pulse` (a cheap CSS
// opacity keyframe, no JS/library), sized via className. Two tone variants
// match the two background colors already used across the app's screens
// (dark panels like Home/Auth vs. the light #f4f1ec panels like Reserve/
// Account/legal pages) so a skeleton reads correctly on either.
export function Skeleton({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const toneClass = tone === "dark" ? "bg-white/10" : "bg-black/[0.06]";
  return <div className={`animate-pulse rounded-xl ${toneClass} ${className}`} />;
}
