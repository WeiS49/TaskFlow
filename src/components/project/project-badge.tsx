interface ProjectBadgeProps {
  name: string;
  color: string;
}

export function ProjectBadge({ name, color }: ProjectBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}26`,
        color,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
