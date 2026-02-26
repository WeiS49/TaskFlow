interface LabelBadgeProps {
  name: string;
  color: string;
}

export function LabelBadge({ name, color }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}1F`,
        color,
      }}
    >
      {name}
    </span>
  );
}
