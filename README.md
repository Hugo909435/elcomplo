# 👑 Le Conseil

Jeu web multijoueur de succession royale. 3 à 8 joueurs incarnent des nobles qui
gèrent un royaume pendant une succession : chacun a un **rôle secret**, une
**allégeance** cachée, un **objectif personnel** et un **pouvoir**. On négocie,
on ment, on s'allie et on trahit — jusqu'à ce que le royaume survive, s'effondre,
ou qu'un prétendant s'empare de la couronne.

Jouable depuis un navigateur mobile ou desktop, en temps réel.

---

## Architecture

Le projet est découpé en trois paquets indépendants, du cœur métier vers l'UI :

| Paquet | Rôle | Techno |
|--------|------|--------|
| `game-engine/` | **Moteur de règles** autoritaire. Aucune dépendance réseau/UI. Déterministe (RNG seedé → parties rejouables). | TypeScript pur |
| `server/` | **Serveur temps réel**. Transporte, valide et filtre ; ne contient aucune règle. Salons, codes, sessions, timers de phase, confidentialité. | NestJS + Socket.io |
| `frontend/` | **Client web responsive mobile-first**. Piloté par l'état serveur, reconnexion automatique. | React + TypeScript + Tailwind + Vite |

Principe directeur : **le moteur est seul juge des règles**. Le serveur ne fait
jamais confiance au client ; le client n'affiche que ce que le serveur lui envoie,
et les informations secrètes (rôle, objectif, résultat d'espionnage) ne sont
transmises qu'au socket du joueur concerné.

```
navigateur ──socket.io── server (NestJS) ──appels── GameEngine (règles)
   React                RoomManager                  état autoritaire
```

---

## Démarrage rapide (développement local)

Prérequis : **Node.js ≥ 20**.

```bash
# 1. Installer les dépendances des trois paquets
npm run install:all

# 2. Construire le moteur (le serveur s'y lie par lien symbolique)
npm run build:engine

# 3. Lancer le serveur de jeu (port 3001)
npm run dev:server

# 4. Dans un second terminal, lancer le frontend (port 5173)
npm run dev:frontend
```

Ouvrir http://localhost:5173. Pour jouer à plusieurs sur le même réseau (téléphones
inclus), Vite écoute déjà sur toutes les interfaces : utiliser l'IP locale de la
machine, ex. `http://192.168.1.20:5173`. Le client cible automatiquement le serveur
sur le port 3001 du même hôte (configurable via `VITE_SERVER_URL`).

---

## Tests

Tous les tests s'exécutent réellement, sans mock du moteur.

```bash
npm test              # moteur + serveur
npm run test:engine   # 42 tests : règles, équilibrage, 600 parties simulées
npm run test:server   # 4 tests d'intégration : partie complète via sockets réels
```

Le test moteur `simulation.test.ts` joue 600 parties de 3 à 8 joueurs avec des
agents aléatoires (votes, pouvoirs, accusations, déconnexions à des moments
arbitraires) et vérifie qu'aucune ne se bloque ni ne lève d'erreur inattendue.
Le test serveur joue une partie complète de bout en bout et vérifie qu'**aucune
information privée ne fuit** en diffusion publique.

---

## Déploiement en production

**L'ordre de build compte** (le serveur se lie au `dist/` du moteur) :

```bash
npm run build:engine     # 1. moteur → game-engine/dist
npm run build:server     # 2. serveur → server/dist
npm run build:frontend   # 3. client  → frontend/dist (fichiers statiques)
# ou tout en une fois :
npm run build
```

### Serveur

Copier `server/.env.example` → `server/.env` et renseigner au minimum :

- `PORT` — port d'écoute (défaut 3001)
- `CORS_ORIGIN` — l'URL exacte du frontend en production (ex. `https://leconseil.example.com`)

Lancer : `npm run start:server` (ou `node server/dist/main.js`).

Le serveur expose `GET /health` pour les sondes de disponibilité.
Les parties terminées sont archivées en JSONL dans `server/data/games.jsonl`.

> **Montée en charge** : l'état des parties est en mémoire vive. Pour plusieurs
> instances derrière un load balancer, activer les *sticky sessions* et brancher
> l'adaptateur Redis de Socket.io. Une seule instance suffit pour des dizaines de
> parties simultanées.

### Frontend

Copier `frontend/.env.example` → `frontend/.env`, renseigner `VITE_SERVER_URL`
avec l'URL publique du serveur, puis `npm run build:frontend`. Servir le contenu
statique de `frontend/dist/` par n'importe quel hébergeur (Nginx, Netlify, Vercel,
Cloudflare Pages…).

---

## Contenu du jeu

- **15 rôles nommés** (`game-engine/src/content/roles.ts`) répartis en 9 Loyalistes,
  3 Prétendants, 3 Agents étrangers — chacun avec une identité, une allégeance et
  un pouvoir.
- **4 pouvoirs** : Espionnage, Revote forcé, Blocage de pouvoir, Voix double du Régent.
- **9 cartes de crise** avec 2-3 options aux effets bornés (`crisisCards.ts`).
- **15 objectifs secrets** vérifiés faisables selon la place du joueur dans la rotation.
- Un module d'**équilibrage** (`balance/`) qui garantit, avant de lancer une partie,
  qu'elle est solvable (le royaume peut survivre), que la couronne est atteignable,
  et qu'aucun rôle hostile n'est surpuissant.

### Conditions de victoire

- **Loyalistes** : le royaume survit (toutes les ressources ≥ seuil de survie).
- **Prétendant** : couronné s'il accumule assez de jetons de soutien comme Régent,
  sans que le royaume ne s'effondre. Le seuil est proportionnel à ses régences réelles.
- **Agent étranger** : le royaume s'effondre **et** il n'a pas été démasqué.
- Chaque joueur a en plus un objectif personnel évalué indépendamment.

Le **démasquage** passe par une **accusation publique** (une par joueur) : viser
juste révèle l'Agent ; se tromper révèle sa propre allégeance.

---

## État de l'audit

Ce dépôt est né d'un audit pré-production. Les 20 problèmes identifiés — dont trois
bugs de règles critiques (victoire du Prétendant mathématiquement impossible,
démasquage inexistant, blocage de partie sur déconnexion) et l'absence totale de
backend, de tests et de client connecté — ont été corrigés et vérifiés. Voir
`AUDIT.md` pour le détail des corrections apportées.
