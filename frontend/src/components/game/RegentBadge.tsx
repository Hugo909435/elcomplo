interface RegentBadgeProps {
  regentName: string;
}

export function RegentBadge({ regentName }: RegentBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-sm font-medium text-amber-300">
      <span aria-hidden>👑</span> {regentName} est Régent
    </div>
  );
}
