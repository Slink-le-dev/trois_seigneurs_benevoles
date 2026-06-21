# Postes Signaleurs — Course de montagne

Application de gestion des postes de signaleurs pour une course de montagne à 3 parcours,
conforme au [cahier des charges](./Cahier_des_charges_Postes_Signaleurs.pdf).

- Mode **organisateur** (`/admin`) : gestion complète (parcours, postes, bénévoles, statuts).
- Mode **consultation** (`/`) : lecture libre, sans compte, sans numéros de téléphone.

## 1. Créer le backend Supabase (gratuit)

1. Créez un compte sur [supabase.com](https://supabase.com) et un nouveau projet (région proche
   de vous, mot de passe DB au choix — non utilisé par l'app).
2. Dans le dashboard Supabase, ouvrez **SQL Editor > New query**, collez le contenu de
   [`supabase/schema.sql`](./supabase/schema.sql) et cliquez sur **Run**. Cela crée les tables,
   la vue publique `benevoles_public`, les règles de sécurité (RLS) et active le Realtime sur
   la table `postes`.
3. Allez dans **Authentication > Users > Add user**, créez le compte organisateur (votre email +
   un mot de passe). C'est l'unique identifiant pour vous connecter sur `/admin`.
4. Allez dans **Project Settings > API** et notez :
   - `Project URL`
   - `anon public` key

## 2. Configurer le frontend

```bash
cd app
cp .env.local.example .env.local
```

Remplissez `.env.local` avec l'URL et la clé `anon` notées ci-dessus :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. Lancer en local

```bash
cd app
npm install
npm run dev
```

Ouvrez l'URL affichée (par défaut http://localhost:5173). Pour tester sur votre téléphone sur le
même réseau Wi-Fi, utilisez l'URL réseau affichée par Vite (ex. http://192.168.x.x:5173).

- `/` : vue consultation (publique).
- `/admin` : connexion avec l'email/mot de passe créé à l'étape 1.3.

## 4. Déploiement (Vercel)

1. Poussez ce projet sur un dépôt GitHub.
2. Sur [vercel.com](https://vercel.com), importez le dépôt, choisissez le dossier `app` comme
   racine du projet (« Root Directory »).
3. Ajoutez les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans
   les paramètres du projet Vercel.
4. Déployez — Vercel détecte automatiquement Vite (`npm run build`, dossier `dist`).

## Structure du projet

```
supabase/schema.sql   Script SQL à exécuter dans Supabase (tables, RLS, vue publique, realtime)
app/                   Application React + Vite + TypeScript
```

Voir le plan détaillé des fonctionnalités dans le cahier des charges.
