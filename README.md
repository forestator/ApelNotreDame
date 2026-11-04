# APEL Notre-Dame — Montfort-sur-Meu

Application web pour organiser l'APEL **à plusieurs** : des projets (cirque, marché de Noël…) contenant des tâches qui
demandent du monde (montage du chapiteau, stands, créneaux). Chacun clique sur « Je suis là » : plus besoin des sondages
WhatsApp, on voit d'un coup d'œil qui vient et combien il en manque.

Angular 21 (zoneless, signals) · Firebase (Auth Google, Firestore, Hosting).

## Démarrage

```bash
# npm 10.9 plante à l'installation (bug arborist « edgesOut ») : utiliser npm 11.
npx -y npm@11 install
ng serve
```

`firebase` est volontairement figé sur la même version que celle attendue par `@angular/fire`
(une seule copie du SDK, sinon Auth et Firestore ne partagent plus la même instance).

## Configurer Firebase

1. Créer un projet sur <https://console.firebase.google.com>.
2. Activer **Authentication > Google**, créer la base **Firestore**, activer **Hosting**.
3. Ajouter une application Web et copier sa config dans `src/environments/environment.ts`.
4. `firebase use --add` pour générer `.firebaserc`, puis `firebase deploy --only firestore:rules`.

## Accès et rôles

Tout le monde peut se connecter avec Google, mais un nouveau compte reste **en attente** tant qu'un admin ne l'a pas approuvé
(page *Membres*). Les règles Firestore (`firestore.rules`) appliquent cette règle côté serveur.

**Premier admin** : se connecter une fois avec Google (la fiche `members/<uid>` est créée en `pending`), puis dans la console
Firestore, modifier ce document : `status = "approved"` et `role = "admin"`. Les suivants se gèrent depuis l'application.

## Modèle de données

- `members/{uid}` : nom, email, photo, `role` (`admin` | `member`), `status` (`pending` | `approved`)
- `projects/{id}` : nom, description, couleur, date
- `tasks/{id}` : `projectId`, titre, description, `date` et `time` (facultatifs), `needed` (personnes recherchées, 0 = pas de
  nombre), `extraPeople` (prévus hors application, comptés dans l'effectif), `participants` (uid → nom), `createdBy`.
  Pas de statut : « complet » et « passé » se déduisent des inscrits et de la date.

> Les commissions ont été retirées de l'application (idée mise de côté). Les anciens documents `commissions/*` restent en base,
> inutilisés ; ils peuvent être supprimés depuis la console Firebase.

## Tests

```bash
npm test -- --watch=false
```

Les tests affichent les vrais composants avec de faux services (`src/testing/`) : ils vérifient l'état de connexion juste après
le login, l'accueil, la carte de tâche (inscription, erreurs visibles, droits), le calendrier et les loaders. Les règles
Firestore ne sont pas couvertes par ces tests : elles se vérifient contre la base avec un jeton de test (voir l'historique).

## Déploiement

```bash
npm run deploy
```

## Logo et couleurs

Le logo est `public/logo.jpeg`. Les couleurs viennent de lui (`src/styles/_variables.scss`) ; le turquoise
d'origine étant trop clair pour du texte (WCAG AA), une version foncée sert aux boutons et au bandeau.

## Import et scripts d'administration

`npm run seed` importe les projets et les tâches de départ (`scripts/seed-data.ts`, **non versionné** : il contient des
données issues d'une conversation privée) avec les droits admin Firebase ;
`--dry-run` simule. Il n'importe que du neuf et ne recrée jamais une tâche supprimée dans l'application.
`--placeholders` crée les fiches « sans compte » (prénoms de la conversation) ; à ne lancer qu'une fois (sinon une fiche supprimée
après remplacement serait recréée). `--replace-tasks` supprime toutes les tâches et recrée celles du fichier (refusé si quelqu'un
d'autre que l'admin en a créé). Il lit une clé de compte de service dans `~/.config/apel/service-account.json`
(Console Firebase > Paramètres > Comptes de service). **Cette clé contourne les règles : ne jamais la versionner.**

## Personnes sans compte

Une fiche « sans compte » (`mock-…`) permet d'inscrire à une tâche quelqu'un qui n'a pas encore créé son compte Google.
Quand la personne s'est connectée et que son compte est approuvé : page **Membres** > *Personnes sans compte* >
choisir le vrai compte > **Remplacer**. Ses inscriptions sont transférées au vrai compte, puis la fiche est supprimée.
*Supprimer* la retire simplement des tâches.
