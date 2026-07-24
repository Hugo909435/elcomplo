import { ConfigurationImbalanceError } from '../errors';
import { Allegiance, PowerType, RoleDefinition } from '../types';

/**
 * Les 15 roles jouables de la base v1 — sous-ensemble adapte de
 * design/roles-50.md, ramene aux 3 allegeances et 4 pouvoirs du moteur pour
 * garantir une base solide et entierement testee avant d'elargir.
 *
 * Repartition : 9 Loyalistes, 3 Pretendants, 3 Agents etrangers. La table de
 * distribution (roleDistribution.ts) exige au plus 4 Loyalistes, 2
 * Pretendants et 2 Agents simultanement : chaque allegeance dispose donc
 * toujours d'un choix de roles, aucune partie ne peut epuiser le pool.
 */
export const DEFAULT_ROLES: RoleDefinition[] = [
  // ---- Loyalistes (defendent la survie du royaume) ----
  {
    id: 'role-chancelier',
    name: 'Le Chancelier',
    description:
      "Chef de l'administration royale. Sa maitrise des procedures lui permet d'annuler le pouvoir d'un autre membre du Conseil.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.BLOCK_POWER,
    powerUses: 1,
  },
  {
    id: 'role-marechal',
    name: 'Le Maréchal',
    description:
      "Commandant des armees du feu Roi. Quand il preside le Conseil, sa voix pese double sur les decisions.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.BOOST_REGENT,
    powerUses: 2,
  },
  {
    id: 'role-espion-couronne',
    name: "L'Espion de la Couronne",
    description:
      "Maitre du renseignement royal. Peut sonder secretement la loyaute d'un autre membre du Conseil.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.SPY_ALLEGIANCE,
    powerUses: 2,
  },
  {
    id: 'role-cardinal',
    name: 'Le Cardinal',
    description:
      "Prince de l'Eglise. Son autorite morale peut exiger qu'un vote conteste soit entierement rejoue.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.FORCE_REVOTE,
    powerUses: 1,
  },
  {
    id: 'role-tresorier',
    name: 'Le Grand Trésorier',
    description:
      "Gardien des finances du royaume. Ses registres lui permettent de percer a jour les allegeances cachees.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.SPY_ALLEGIANCE,
    powerUses: 1,
  },
  {
    id: 'role-duc',
    name: 'Le Duc de Ferremont',
    description:
      "Seigneur de la plus riche province. Son poids politique renforce le Regent qu'il choisit de soutenir.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.BOOST_REGENT,
    powerUses: 2,
  },
  {
    id: 'role-diplomate',
    name: 'La Diplomate',
    description:
      "Negociatrice au service de la paix. Peut suspendre une decision douteuse et forcer le Conseil a revoter.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.FORCE_REVOTE,
    powerUses: 1,
  },
  {
    id: 'role-juge',
    name: 'Le Juge Royal',
    description:
      "Garant des lois du royaume. Peut frapper de nullite le pouvoir d'un conseiller qu'il soupconne.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.BLOCK_POWER,
    powerUses: 1,
  },
  {
    id: 'role-chambellane',
    name: 'La Chambellane',
    description:
      "Maitresse des clefs du palais. Rien de ce qui s'y murmure ne lui echappe tres longtemps.",
    allegiance: Allegiance.LOYALIST,
    power: PowerType.SPY_ALLEGIANCE,
    powerUses: 2,
  },

  // ---- Pretendants (veulent la couronne pour eux-memes) ----
  {
    id: 'role-prince',
    name: 'Le Prince Héritier',
    description:
      "Heritier presume au sang conteste. Quand il preside le Conseil, il sait faire peser sa legitimite sur le vote.",
    allegiance: Allegiance.CLAIMANT,
    power: PowerType.BOOST_REGENT,
    powerUses: 2,
  },
  {
    id: 'role-duchesse',
    name: 'La Duchesse Prétendante',
    description:
      "Cousine du feu Roi, patiente et implacable. Peut faire rejouer un vote qui ne sert pas ses interets.",
    allegiance: Allegiance.CLAIMANT,
    power: PowerType.FORCE_REVOTE,
    powerUses: 1,
  },
  {
    id: 'role-batard',
    name: 'Le Bâtard Légitimé',
    description:
      "Fils illegitime reconnu sur le tard. A grandi dans l'ombre et sait y lire les secrets des autres.",
    allegiance: Allegiance.CLAIMANT,
    power: PowerType.SPY_ALLEGIANCE,
    powerUses: 2,
  },

  // ---- Agents etrangers (veulent l'effondrement du royaume) ----
  {
    id: 'role-emissaire',
    name: "L'Émissaire de l'Ombre",
    description:
      "Agent d'une puissance rivale infiltre au Conseil. Sait neutraliser le conseiller le plus dangereux pour sa mission.",
    allegiance: Allegiance.FOREIGN_AGENT,
    power: PowerType.BLOCK_POWER,
    powerUses: 1,
  },
  {
    id: 'role-courtisane',
    name: 'La Courtisane Vipère',
    description:
      "Confidente de la moitie de la cour. Collecte les allegeances des uns pour mieux servir les interets d'un autre trone.",
    allegiance: Allegiance.FOREIGN_AGENT,
    power: PowerType.SPY_ALLEGIANCE,
    powerUses: 2,
  },
  {
    id: 'role-faux-pretre',
    name: 'Le Faux Prêtre',
    description:
      "Predicateur venu d'ailleurs, sa foi est une couverture. Semer le doute et faire rejouer les votes est sa liturgie.",
    allegiance: Allegiance.FOREIGN_AGENT,
    power: PowerType.FORCE_REVOTE,
    powerUses: 1,
  },
];

/**
 * Garantit que le pool de roles peut couvrir n'importe quelle partie de 3 a
 * 8 joueurs : assez de roles distincts par allegeance pour le maximum de la
 * table de distribution, et pas d'identifiants dupliques.
 */
export function validateRolePool(pool: RoleDefinition[], requiredPerAllegiance: Record<Allegiance, number>): void {
  const ids = new Set(pool.map((r) => r.id));
  if (ids.size !== pool.length) {
    throw new ConfigurationImbalanceError('Des identifiants de roles sont dupliques dans le pool');
  }
  for (const allegiance of Object.values(Allegiance)) {
    const available = pool.filter((r) => r.allegiance === allegiance).length;
    const required = requiredPerAllegiance[allegiance];
    if (available < required) {
      throw new ConfigurationImbalanceError(
        `Pool de roles insuffisant pour ${allegiance} : ${available} disponibles, ${required} requis`,
      );
    }
  }
}
