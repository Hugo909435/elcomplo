import { ResourceGauge } from './ResourceGauge';
import { ResourceKey, type ResourceState } from '../../types/game';

interface ResourceGaugeGridProps {
  resources: ResourceState;
}

const RESOURCE_META: Record<ResourceKey, { label: string; icon: string }> = {
  [ResourceKey.TREASURY]: { label: 'Trésor', icon: '💰' },
  [ResourceKey.STABILITY]: { label: 'Stabilité', icon: '⚖️' },
  [ResourceKey.ARMY]: { label: 'Armée', icon: '⚔️' },
  [ResourceKey.FAITH]: { label: 'Foi', icon: '🙏' },
};

/** Grille 2x2 : l'etat du royaume en un regard, sans defiler. */
export function ResourceGaugeGrid({ resources }: ResourceGaugeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {Object.values(ResourceKey).map((key) => (
        <ResourceGauge key={key} label={RESOURCE_META[key].label} icon={RESOURCE_META[key].icon} value={resources[key]} />
      ))}
    </div>
  );
}
