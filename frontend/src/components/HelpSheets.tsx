import { ALLEGIANCE_GROUPS, ROLE_CATALOG } from '../content/roles';
import { ALLEGIANCE_ICONS, POWER_LABELS } from '../lib/labels';

/** En-tête commun aux overlays d'aide : titre + bouton fermer, barre collante. */
function SheetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-900/95 backdrop-blur px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-slate-800">
        <h1 className="text-lg font-bold text-slate-50">{title}</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
        >
          ✕
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(env(safe-area-inset-bottom),2rem)] max-w-lg w-full mx-auto">
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wide text-amber-300">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

/** Panneau « Comment jouer » : but du jeu, déroulé d'une manche, victoires. */
export function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetShell title="Comment jouer" onClose={onClose}>
      <p className="text-base text-slate-200">
        <span className="font-bold text-slate-50">Le roi est mort.</span> De 3 à 8 nobles siègent au Conseil pour gérer
        le royaume pendant la succession. Chacun a une <strong>allégeance secrète</strong> et un <strong>objectif
        personnel</strong> — et va négocier, mentir, s'allier et trahir pour l'atteindre.
      </p>

      <div className="mt-4 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
        <p className="text-sm text-slate-300">
          <strong className="text-amber-300">Est-ce un jeu d'équipe ?</strong> Pas vraiment. Personne ne sait avec
          certitude qui est dans son camp. Les Loyalistes partagent un but commun, mais les Prétendants jouent chacun
          pour soi et les Agents avancent masqués. <strong>Plusieurs joueurs peuvent gagner dans la même partie</strong>,
          chacun selon son camp et son objectif personnel.
        </p>
      </div>

      <div className="my-5 h-px bg-slate-800" />

      <Section title="Les trois camps">
        {ALLEGIANCE_GROUPS.map((g) => (
          <div key={g.allegiance} className={`rounded-xl border px-3 py-2.5 ${g.classes}`}>
            <p className="font-semibold text-slate-100">
              <span aria-hidden>{ALLEGIANCE_ICONS[g.allegiance]}</span> {g.title}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{g.goal}</p>
          </div>
        ))}
        <p className="text-xs text-slate-500">
          Les Loyalistes sont majoritaires. Le nombre de Prétendants et d'Agents dépend du nombre de joueurs.
        </p>
      </Section>

      <Section title="Le royaume : 4 ressources">
        <p>
          Chaque décision fait varier quatre jauges, de 0 à 10 (elles démarrent toutes à 6) :{' '}
          <strong>💰 Trésor</strong>, <strong>⚖️ Stabilité</strong>, <strong>⚔️ Armée</strong>, <strong>🙏 Foi</strong>.
        </p>
        <p>
          À la fin de chaque manche, une fois la décision appliquée, l'état du royaume est vérifié. Il suffit qu'
          <strong>une seule</strong> jauge tombe à <strong>0</strong> pour que le royaume <strong>s'effondre</strong> —
          la partie s'arrête aussitôt, sans jouer les manches restantes. Pas besoin que les quatre tombent : une seule à
          zéro suffit.
        </p>
        <div className="mt-1 space-y-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-900 px-3 py-2">
            <span className="font-mono text-sm font-bold text-red-300">0</span>
            <span className="text-xs text-slate-300">Effondrement immédiat — fin de partie.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-950/40 border border-amber-900 px-3 py-2">
            <span className="font-mono text-sm font-bold text-amber-300">1–2</span>
            <span className="text-xs text-slate-300">
              Le royaume tient de justesse, mais n'a pas vraiment « survécu » : les Loyalistes ne gagnent pas.
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-900 px-3 py-2">
            <span className="font-mono text-sm font-bold text-emerald-300">≥ 3</span>
            <span className="text-xs text-slate-300">Jauge en bonne santé — contribue à la survie du royaume.</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Les Loyalistes ne l'emportent que si, à la fin, les <strong>quatre</strong> jauges sont à 3 ou plus. Entre 1 et
          2, le royaume survit sans que personne ne gagne par sa survie.
        </p>
      </Section>

      <Section title="Le déroulé d'une manche">
        <ol className="space-y-2 list-none">
          <li>
            <strong className="text-slate-100">1. Crise</strong> — une carte de crise est révélée avec 2 ou 3 options.
            Un joueur est <strong>Régent</strong> ce tour-ci (le rôle tourne à chaque manche).
          </li>
          <li>
            <strong className="text-slate-100">2. Négociation</strong> — discutez au chat du Conseil : alliances,
            promesses, mensonges.
          </li>
          <li>
            <strong className="text-slate-100">3. Pouvoirs</strong> — activez secrètement votre pouvoir si vous le
            souhaitez.
          </li>
          <li>
            <strong className="text-slate-100">4. Vote</strong> — chacun vote une option. Le vote reste secret jusqu'à
            la résolution ; vous pouvez en changer tant que le temps court. En cas d'égalité, le Régent tranche.
          </li>
          <li>
            <strong className="text-slate-100">5. Résolution</strong> — l'option retenue s'applique, les ressources
            évoluent, puis la manche suivante commence.
          </li>
        </ol>
      </Section>

      <Section title="Le Régent — change à chaque manche">
        <p>
          À chaque manche, un joueur préside le Conseil : c'est le <strong>Régent</strong>. Le rôle tourne dans l'ordre
          des sièges, donc <strong>chacun l'est au moins une fois</strong>.
        </p>
        <p>
          Le Régent <strong>n'est pas un dictateur</strong> : il ne choisit pas l'option seul, tout le monde vote à
          égalité. Mais il a trois atouts :
        </p>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>
            <strong className="text-slate-100">Il tranche les égalités</strong> — si le vote est à égalité et qu'il a
            voté l'une des options en tête, la sienne l'emporte.
          </li>
          <li>
            <strong className="text-slate-100">Il encaisse les soutiens</strong> — si l'option retenue porte un bonus de
            soutien, c'est lui, et lui seul, qui empoche le jeton.
          </li>
          <li>
            <strong className="text-slate-100">Voix double</strong> — certains rôles ont un pouvoir qui, utilisé pendant
            leur régence, fait compter leur vote pour deux.
          </li>
        </ul>
      </Section>

      <Section title="L'accusation — démasquer un Agent">
        <p>
          <strong>Une seule fois par partie</strong>, tu peux accuser publiquement un joueur d'être un Agent étranger.
          Si tu vises juste, il est <strong>démasqué</strong> et perd sa victoire cachée. Si tu te trompes, c'est{' '}
          <strong>ta propre allégeance</strong> qui est révélée à toute la table. À manier avec prudence.
        </p>
      </Section>

      <Section title="Comment on gagne">
        <ul className="space-y-1.5 list-disc pl-5">
          <li>
            <strong className="text-sky-300">Loyalistes</strong> — le royaume survit : les 4 jauges à 3 ou plus à la
            fin, sans effondrement.
          </li>
          <li>
            <strong className="text-amber-300">Prétendant</strong> — couronné s'il réunit assez de jetons de soutien
            (gagnés comme Régent) sans que le royaume tombe.
          </li>
          <li>
            <strong className="text-red-300">Agent étranger</strong> — le royaume s'effondre et il n'a pas été démasqué.
          </li>
          <li>
            <strong className="text-slate-100">Objectif secret</strong> — en plus, chaque joueur a une mission
            personnelle évaluée à part : on peut la réussir même si son camp perd.
          </li>
        </ul>
      </Section>

      <Section title="Qui gagne la partie ? (le classement)">
        <p>
          À la fin, tout est converti en <strong>points</strong> pour désigner clairement un vainqueur :
        </p>
        <ul className="space-y-1.5 list-none">
          <li className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <span className="font-mono text-sm font-bold text-amber-300">+2</span>
            <span className="text-sm text-slate-300">si ton camp remporte sa victoire.</span>
          </li>
          <li className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <span className="font-mono text-sm font-bold text-emerald-300">+1</span>
            <span className="text-sm text-slate-300">si tu réussis ton objectif secret personnel.</span>
          </li>
        </ul>
        <p>
          Le joueur au <strong>score le plus élevé remporte la partie</strong> (maximum 3 points : camp + objectif). En
          cas d'égalité au sommet, c'est une <strong>victoire partagée</strong>. Si personne ne marque le moindre point
          (royaume effondré sans Agent caché, aucun objectif atteint), la partie n'a <strong>pas de vainqueur</strong>.
        </p>
        <p className="text-xs text-slate-500">
          L'écran de fin affiche le classement complet, ton total, et révèle le rôle et l'objectif de chacun.
        </p>
      </Section>

      <Section title="S'emparer de la couronne (Prétendant)">
        <p>
          Il n'y a <strong>pas de « vote pour élire un roi »</strong>. La couronne se gagne en accumulant des{' '}
          <strong>jetons de soutien</strong>, et on n'en gagne qu'en étant Régent : quand le Conseil vote une option{' '}
          <em>intéressée</em> (environ une par crise), le Régent du moment empoche <strong>+1 soutien</strong>.
        </p>
        <p>
          À la fin, un Prétendant est couronné s'il a réuni assez de soutiens (environ{' '}
          <strong>0,6 × son nombre de régences</strong>, au minimum 1) <strong>et</strong> que le royaume n'a pas
          sombré. Son défi : convaincre la table de choisir « son » option pendant ses rares régences — sans jamais
          couler le royaume, sous peine de perdre la couronne.
        </p>
        <p className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm text-slate-300">
          <strong className="text-amber-300">Soutenir le Régent est à double tranchant.</strong> Voter son option peut
          être le meilleur choix pour le royaume ce tour-là… mais ça nourrit aussi son ambition. Si tu le soupçonnes
          d'être un Prétendant, tu voudras peut-être lui refuser ce soutien.
        </p>
      </Section>

      <p className="mt-6 text-center text-xs text-slate-500">
        La partie dure assez de manches pour que chaque joueur soit Régent au moins une fois.
      </p>
    </SheetShell>
  );
}

/** Panneau « Les 15 rôles » : catalogue groupé par camp. */
export function RolesSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetShell title="Les 15 rôles" onClose={onClose}>
      <p className="text-sm text-slate-400">
        Voici tous les rôles possibles. En partie, chacun reçoit le sien en secret — à toi de deviner ceux des autres.
      </p>

      {ALLEGIANCE_GROUPS.map((group) => {
        const roles = ROLE_CATALOG.filter((r) => r.allegiance === group.allegiance);
        return (
          <div key={group.allegiance} className="mt-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <span aria-hidden>{ALLEGIANCE_ICONS[group.allegiance]}</span>
              {group.title}
              <span className="text-xs font-normal text-slate-500">({roles.length})</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{group.goal}</p>

            <ul className="mt-3 space-y-2.5">
              {roles.map((role) => {
                const power = POWER_LABELS[role.power];
                return (
                  <li key={role.id} className={`rounded-2xl border px-4 py-3 ${group.classes}`}>
                    <p className="font-bold text-slate-50">{role.name}</p>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">{role.description}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                      <span aria-hidden>{power.icon}</span>
                      <span className="font-semibold text-slate-200">{power.name}</span>
                      <span className="text-slate-500">·</span>
                      <span>
                        {role.powerUses} usage{role.powerUses > 1 ? 's' : ''}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="mt-6 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-amber-300">Les 4 pouvoirs</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
          {Object.values(POWER_LABELS).map((p) => (
            <li key={p.name}>
              <span aria-hidden>{p.icon}</span> <strong className="text-slate-100">{p.name}</strong> — {p.description}
            </li>
          ))}
        </ul>
      </div>
    </SheetShell>
  );
}
