interface FabAction {
  key: string;
  icon: string;
  label: string;
  badgeCount?: number;
  onClick: () => void;
}

interface FloatingActionMenuProps {
  actions: FabAction[];
}

/**
 * Cluster de boutons flottants en zone pouce (bas-droite) : acces en 1 tap
 * aux ecrans secondaires (role, messages, journal) sans jamais quitter
 * l'ecran Royaume par une navigation complete.
 */
export function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  return (
    <div className="fixed right-4 bottom-[max(env(safe-area-inset-bottom),1rem)] flex flex-col gap-3 z-30">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className="relative h-14 w-14 rounded-full bg-slate-800 border border-slate-600 shadow-xl shadow-black/30 flex items-center justify-center text-2xl active:scale-95 transition-transform"
        >
          <span aria-hidden>{action.icon}</span>
          {!!action.badgeCount && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
              {action.badgeCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
