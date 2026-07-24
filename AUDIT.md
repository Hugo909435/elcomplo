# AUDIT — Le Conseil : corrections apportées

Suivi des 20 problèmes relevés lors de l'audit pré-production, dans leur ordre de
correction. Chaque correction est couverte par au moins un test exécuté
(`npm test`).

| # | Problème | Gravité | État | Où / preuve |
|---|----------|---------|------|-------------|
| 1 | Scope des rôles : 50 designés vs 3 allégeances | Critique | ✅ Ramené à **15 rôles nommés** (9/3/3) reliés aux allégeances et pouvoirs | `game-engine/src/content/roles.ts` |
| 2 | Deadlock `openVote()` si la cible d'un pouvoir se déconnecte | Critique | ✅ `PowerResolver` ne lève plus jamais ; intention invalide → `blocked` | `PowerResolver.ts`, test « regression M1 » |
| 3 | Victoire du Prétendant mathématiquement impossible | Critique | ✅ Seuil recalculé **par siège** (proportionnel aux régences réelles) | `engine/schedule.ts`, test « regression G1 » |
| 4 | `revealed` jamais écrit : pas de démasquage | Critique | ✅ Mécanique d'**accusation publique** (`accuse()`) | `GameEngine.ts`, tests « regression G2 » |
| 5 | Zéro test automatisé | Critique | ✅ **42 tests moteur** + 600 parties simulées | `game-engine/src/__tests__/` |
| 6 | Objectifs irréalisables selon le siège | Important | ✅ `isObjectiveFeasibleForSeat` filtre à l'attribution | `RoleAssigner.ts`, test dédié |
| 7 | Siège 7 jamais Régent à 8 joueurs + `BOOST_REGENT` mort | Important | ✅ `totalRounds` relevé à ≥ nb joueurs | `effectiveTotalRounds`, test « rotation 8 joueurs » |
| 8 | Exploit abstention → `options[0]` déterministe | Moyen | ✅ Choix par **tirage au sort seedé** en l'absence de vainqueur | `VoteResolver.ts`, test dédié |
| 9 | `validateObjectivePool` jamais appelée + pool trop petit | Moyen | ✅ Appelée à `create()` ; pool porté à 15 objectifs | `GameEngine.create`, `secretObjectives.ts` |
| 10 | Backend NestJS/Socket.io à construire | Critique | ✅ Gateway + RoomManager : salons, codes, timers, sérialisation | `server/src/game/` |
| 11 | Pas de persistance / reprise | Critique | ✅ **Reconnexion par token** + archive JSONL des parties finies | `RoomManager.attachSocket`, test reconnexion |
| 12 | Authentification socket | Critique | ✅ Token de session opaque exigé sur chaque commande | `game.gateway.ts`, test « sans session » |
| 13 | `powersResolved` broadcast = fuite des espionnages | Important | ✅ Payload public assaini (SPY jamais diffusé) | `GameEngine.resolvePowerIntents`, test anti-fuite |
| 14 | Reconnexion / resync après fermeture navigateur | Important | ✅ `session:resume` renvoie un snapshot complet | test intégration + `GameContext` |
| 15 | Types dupliqués front/back divergents | Important | ✅ Miroir unique typé du protocole côté client | `frontend/src/types/game.ts`, `server/.../protocol.ts` |
| 16 | Frontend : écrans manquants + intégration socket | Critique | ✅ Accueil, lobby, jeu, actions, résolution, fin — connectés | `frontend/src/screens/` |
| 17 | Système d'événements dynamiques orphelin | Important | ⚠️ Hors périmètre v1, laissé isolé (documenté), non branché | `events/` (inchangé) |
| 18 | Phase NEGOTIATION vide | Important | ✅ **Chat de salon** temps réel | `ChatPanel.tsx`, `RoomManager.sendChat` |
| 19 | UX : gel du vote, bottom sheets, tie trompeur | Moyen | ✅ Vote gelé à 0 s, vraies bottom sheets, `wasChosenByLot` distinct | `GameScreen`, `VoteResolver` |
| 20 | Hygiène : éviction mémoire, rate limiting, archivage | Moyen | ✅ Purge des salons inactifs, rate limiting gateway, JSONL | `RoomManager.cleanupStaleRooms`, `game.gateway.ts` |

## Décision de périmètre : item 17

Le générateur de 500 événements dynamiques (`game-engine/src/events/`) reste
présent mais **non branché** sur la boucle de jeu, qui utilise les 9 cartes de
crise écrites à la main. C'est un choix assumé pour livrer une **base solide et
entièrement testée** : brancher les événements dynamiques changerait les contrats
réseau et demanderait sa propre campagne de tests. Il constitue la première
extension naturelle une fois la v1 en production.

## Vérifications exécutées

- `npm run test:engine` → 42 tests, 600 parties simulées : **pass**
- `npm run test:server` → 4 tests d'intégration sockets : **pass**
- `npm run build` (moteur + serveur + frontend) : **pass**, lint frontend propre
- Serveur lancé réellement, `GET /health` OK, **partie complète 4 joueurs** jouée
  de bout en bout via clients socket contre le build déployé, **aucune fuite privée**.
