import type { Allegiance, PowerType } from '../types/game';

/**
 * Catalogue des 15 rôles, pour la présentation avant partie (accueil).
 *
 * MIROIR de game-engine/src/content/roles.ts : noms, allégeances et pouvoirs
 * doivent rester identiques au moteur. Ce sont des données publiques (les
 * joueurs connaissent la liste des rôles possibles) ; en partie, qui joue
 * quel rôle reste secret. Toute modification côté moteur doit être répercutée
 * ici.
 */
export interface RoleCatalogEntry {
  id: string;
  name: string;
  description: string;
  allegiance: Allegiance;
  power: PowerType;
  powerUses: number;
}

export const ROLE_CATALOG: RoleCatalogEntry[] = [
  // ---- Loyalistes ----
  {
    id: 'role-chancelier',
    name: 'Le Chancelier',
    description:
      "Chef de l'administration royale. Sa maîtrise des procédures lui permet d'annuler le pouvoir d'un autre membre du Conseil.",
    allegiance: 'LOYALIST',
    power: 'BLOCK_POWER',
    powerUses: 1,
  },
  {
    id: 'role-marechal',
    name: 'Le Maréchal',
    description: "Commandant des armées du feu Roi. Quand il préside le Conseil, sa voix pèse double sur les décisions.",
    allegiance: 'LOYALIST',
    power: 'BOOST_REGENT',
    powerUses: 2,
  },
  {
    id: 'role-espion-couronne',
    name: "L'Espion de la Couronne",
    description: "Maître du renseignement royal. Peut sonder secrètement la loyauté d'un autre membre du Conseil.",
    allegiance: 'LOYALIST',
    power: 'SPY_ALLEGIANCE',
    powerUses: 2,
  },
  {
    id: 'role-cardinal',
    name: 'Le Cardinal',
    description: "Prince de l'Église. Son autorité morale peut exiger qu'un vote contesté soit entièrement rejoué.",
    allegiance: 'LOYALIST',
    power: 'FORCE_REVOTE',
    powerUses: 1,
  },
  {
    id: 'role-tresorier',
    name: 'Le Grand Trésorier',
    description: "Gardien des finances du royaume. Ses registres lui permettent de percer à jour les allégeances cachées.",
    allegiance: 'LOYALIST',
    power: 'SPY_ALLEGIANCE',
    powerUses: 1,
  },
  {
    id: 'role-duc',
    name: 'Le Duc de Ferremont',
    description: "Seigneur de la plus riche province. Son poids politique renforce le Régent qu'il choisit de soutenir.",
    allegiance: 'LOYALIST',
    power: 'BOOST_REGENT',
    powerUses: 2,
  },
  {
    id: 'role-diplomate',
    name: 'La Diplomate',
    description: "Négociatrice au service de la paix. Peut suspendre une décision douteuse et forcer le Conseil à revoter.",
    allegiance: 'LOYALIST',
    power: 'FORCE_REVOTE',
    powerUses: 1,
  },
  {
    id: 'role-juge',
    name: 'Le Juge Royal',
    description: "Garant des lois du royaume. Peut frapper de nullité le pouvoir d'un conseiller qu'il soupçonne.",
    allegiance: 'LOYALIST',
    power: 'BLOCK_POWER',
    powerUses: 1,
  },
  {
    id: 'role-chambellane',
    name: 'La Chambellane',
    description: "Maîtresse des clefs du palais. Rien de ce qui s'y murmure ne lui échappe très longtemps.",
    allegiance: 'LOYALIST',
    power: 'SPY_ALLEGIANCE',
    powerUses: 2,
  },

  // ---- Prétendants ----
  {
    id: 'role-prince',
    name: 'Le Prince Héritier',
    description:
      "Héritier présumé au sang contesté. Quand il préside le Conseil, il sait faire peser sa légitimité sur le vote.",
    allegiance: 'CLAIMANT',
    power: 'BOOST_REGENT',
    powerUses: 2,
  },
  {
    id: 'role-duchesse',
    name: 'La Duchesse Prétendante',
    description: "Cousine du feu Roi, patiente et implacable. Peut faire rejouer un vote qui ne sert pas ses intérêts.",
    allegiance: 'CLAIMANT',
    power: 'FORCE_REVOTE',
    powerUses: 1,
  },
  {
    id: 'role-batard',
    name: 'Le Bâtard Légitimé',
    description: "Fils illégitime reconnu sur le tard. A grandi dans l'ombre et sait y lire les secrets des autres.",
    allegiance: 'CLAIMANT',
    power: 'SPY_ALLEGIANCE',
    powerUses: 2,
  },

  // ---- Agents étrangers ----
  {
    id: 'role-emissaire',
    name: "L'Émissaire de l'Ombre",
    description:
      "Agent d'une puissance rivale infiltré au Conseil. Sait neutraliser le conseiller le plus dangereux pour sa mission.",
    allegiance: 'FOREIGN_AGENT',
    power: 'BLOCK_POWER',
    powerUses: 1,
  },
  {
    id: 'role-courtisane',
    name: 'La Courtisane Vipère',
    description:
      "Confidente de la moitié de la cour. Collecte les allégeances des uns pour mieux servir les intérêts d'un autre trône.",
    allegiance: 'FOREIGN_AGENT',
    power: 'SPY_ALLEGIANCE',
    powerUses: 2,
  },
  {
    id: 'role-faux-pretre',
    name: 'Le Faux Prêtre',
    description:
      "Prédicateur venu d'ailleurs, sa foi est une couverture. Semer le doute et faire rejouer les votes est sa liturgie.",
    allegiance: 'FOREIGN_AGENT',
    power: 'FORCE_REVOTE',
    powerUses: 1,
  },
];

export const ALLEGIANCE_GROUPS: Array<{
  allegiance: Allegiance;
  title: string;
  goal: string;
  classes: string;
}> = [
  {
    allegiance: 'LOYALIST',
    title: 'Loyalistes',
    goal: 'Font vivre le royaume : ils gagnent si toutes les ressources restent au-dessus du seuil de survie.',
    classes: 'bg-sky-950/40 border-sky-800',
  },
  {
    allegiance: 'CLAIMANT',
    title: 'Prétendants',
    goal: "Veulent la couronne : ils gagnent en accumulant du soutien comme Régent, sans laisser le royaume s'effondrer.",
    classes: 'bg-amber-950/40 border-amber-800',
  },
  {
    allegiance: 'FOREIGN_AGENT',
    title: 'Agents étrangers',
    goal: "Servent une puissance rivale : ils gagnent si le royaume s'effondre sans qu'ils aient été démasqués.",
    classes: 'bg-red-950/40 border-red-900',
  },
];
