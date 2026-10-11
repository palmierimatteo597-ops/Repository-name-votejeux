# Lecture périodique Supabase

Le workflow [Supabase keepalive](../.github/workflows/supabase-keepalive.yml)
effectue une lecture toutes les six heures : **00:17, 06:17, 12:17 et 18:17 UTC**.
En France métropolitaine, ajouter une heure en hiver et deux heures en été.
Il peut aussi être lancé manuellement. Il ne dépend ni de Vercel ni d'UptimeRobot.

## Requête choisie et vérification

```http
GET https://dbexgcoipngmzxjolzbn.supabase.co/rest/v1/games?select=id&limit=1
apikey: <clé publique fournie par le secret GitHub>
Accept: application/json
Accept-Profile: public
Cache-Control: no-cache
```

Il s'agit d'une lecture de la relation `public.games` par PostgREST, qui interroge
PostgreSQL, limitée à une colonne et au maximum une ligne. Aucun comptage complet,
tri, écriture ou appel aux routes de synchronisation de VoteJeux n'est effectué.

Éléments vérifiés dans le dépôt :

- `lib/supabase.js` initialise le client public avec `NEXT_PUBLIC_SUPABASE_URL`
  et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `app/maitre/[code]/page.js` lit `games` avec ce client public.
- `app/vote/[code]/page.js` lit également `games` avec ce client.
- `app/api/sync/route.js` sélectionne explicitement `id` dans cette table
  (cette route utilise une clé serveur, qui n'est pas utilisée par le workflow).

Le 12 octobre 2026, un GET réel sur `games?select=id&limit=1` avec la clé
`sb_publishable_…` disponible localement a renvoyé **HTTP 200**, un tableau JSON
contenant une ligne avec la propriété `id`. La clé et l'identifiant n'ont pas été
affichés. Cela confirme l'accès public actuel à cette lecture. Aucune migration
SQL ni définition des politiques RLS n'est présente dans le dépôt : ce test ne
constitue pas un audit de ces politiques.

La clé publique est envoyée uniquement dans `apikey`, sans session utilisateur.
Elle utilise les permissions du rôle `anon`. Ce n'est pas un JWT à envoyer dans
`Authorization: Bearer` ; voir la [documentation des clés Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Secrets GitHub à créer

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New
repository secret**. Créer ces deux secrets de dépôt (pas des secrets
d'environnement, car ce workflow ne cible aucun environnement GitHub) :

| Nom | Valeur attendue |
| --- | --- |
| `SUPABASE_URL` | `https://dbexgcoipngmzxjolzbn.supabase.co` sans `/rest/v1/` |
| `SUPABASE_PUBLISHABLE_KEY` | La clé publique complète commençant par `sb_publishable_`, disponible dans les paramètres API du projet Supabase |

La variable locale `NEXT_PUBLIC_SUPABASE_ANON_KEY` contient actuellement cette
clé publique malgré son ancien nom. Copier uniquement sa valeur, sans guillemets.
Les variables Vercel et `.env.local` ne sont pas automatiquement disponibles
dans GitHub Actions. Ne pas copier `SUPABASE_SERVICE_KEY`, une clé `service_role`
ou `sb_secret_` : le workflow accepte uniquement le format `sb_publishable_`.

## Mise en service et test manuel

1. Après revue et accord pour la publication, committer et pousser les fichiers
   sur GitHub, puis intégrer le workflow à la branche par défaut du dépôt.
   La planification et la disponibilité du déclenchement manuel en dépendent.
2. Configurer les deux secrets ci-dessus et vérifier que GitHub Actions est
   autorisé dans **Settings → Actions → General**.
3. Ouvrir **Actions → Supabase keepalive → Run workflow**, sélectionner la branche
   par défaut et cliquer sur **Run workflow**.
4. Ouvrir le job `read-games`, puis l'étape **Read one game through the public
   REST API**. Attendre un résultat vert et le message
   `Supabase database read succeeded (HTTP 200, 1 visible row(s)).`
5. Vérifier ensuite qu'une exécution planifiée apparaît après l'un des créneaux
   UTC indiqués plus haut. Consulter les logs et notifications d'échec d'Actions.

Le workflow échoue si un secret manque ou a un format incorrect, en cas de
problème réseau, délai dépassé, redirection, statut HTTP autre que 200, réponse
non JSON ou structure inattendue. Un HTTP 401/403 signale explicitement de
vérifier la clé et les permissions existantes. Un HTTP 404 peut notamment
indiquer un projet indisponible ou une relation absente. Ne pas résoudre ces
erreurs en désactivant RLS ou en utilisant une clé privilégiée.

Un tableau vide `[]` reste une lecture valide et déclenche un avertissement :
il peut signifier une table vide ou des lignes masquées par RLS. Il ne prouve pas
que les lignes sont accessibles. Le workflow ne journalise ni clé, ni données
de jeux, ni corps de réponse d'erreur. Chaque requête a un délai de 30 secondes,
et le job est limité à deux minutes. Il n'effectue pas de nouvelle tentative.

## Coût et limites

- Le job utilise Python et sa bibliothèque standard sur un runner Linux GitHub,
  sans checkout, installation de dépendances ou permission sur le dépôt.
  Quatre exécutions quotidiennes consomment des minutes GitHub Actions. Sur un
  dépôt privé, vérifier le quota gratuit restant et les autres workflows ; la
  gratuité dépend des [conditions et quotas GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- Supabase indique que les projets gratuits avec une faible activité sur sept
  jours peuvent être mis en pause. Ces lectures créent une activité réelle sur
  la base, mais **Supabase ne garantit pas officiellement qu'elles empêchent
  toute pause**, ni qu'une telle fréquence suffit. Voir les
  [règles de mise en pause Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).
- GitHub peut retarder ou supprimer des exécutions planifiées en cas de charge.
  Dans un dépôt public, les workflows planifiés sont désactivés après 60 jours
  sans activité sur le dépôt : vérifier leur état et les réactiver si nécessaire.
  Voir les [limites du déclencheur schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- Le workflow ne réactive pas un projet déjà en pause : il faut alors le
  restaurer dans Supabase et relancer un test manuel. Une clé révoquée, des
  permissions modifiées ou une indisponibilité réseau feront échouer la lecture.
- Les salons, les votes, Realtime, les données et les politiques RLS ne sont pas
  modifiés. Aucune table ni politique n'est créée.
