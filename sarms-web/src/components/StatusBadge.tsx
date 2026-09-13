export function StatusBadge({ code, colorHex }: { code: string; colorHex?: string }) {
  const color = colorHex ?? '#475569';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {code.replace(/_/g, ' ')}
    </span>
  );
}
