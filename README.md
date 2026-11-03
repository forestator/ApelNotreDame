# APEL Notre-Dame — Montfort-sur-Meu

Application web pour organiser les commissions de l'APEL : qui fait quoi, quelles tâches restent à prendre.

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
- `commissions/{id}` : nom, description, responsable (`leadUid`, `leadName`)
- `tasks/{id}` : `commissionId`, titre, description, `status` (`todo` | `in-progress` | `done`), `assigneeUid` (`null` = tâche libre), échéance

## Déploiement

```bash
ng build && firebase deploy
```

## Logo et couleurs

Le logo est `public/logo.jpeg`. Les couleurs viennent de lui (`src/styles/_variables.scss`) ; le turquoise
d'origine étant trop clair pour du texte (WCAG AA), une version foncée sert aux boutons et au bandeau.

## Import et scripts d'administration

`npm run seed` importe les commissions de la saison (`src/app/core/data/seed-data.ts`, **non versionné** : il contient des
données issues d'une conversation privée) avec les droits admin Firebase ;
`--dry-run` simule. Il n'importe que du neuf et ne recrée jamais une tâche supprimée dans l'application.
`--placeholders` crée les fiches « sans compte » (prénoms de la conversation) et `--assign` remplit les responsables encore vides ;
à ne lancer qu'une fois (sinon une fiche supprimée après remplacement serait recréée). Il lit une clé de compte de service dans `~/.config/apel/service-account.json`
(Console Firebase > Paramètres > Comptes de service). **Cette clé contourne les règles : ne jamais la versionner.**

## Notifications par e-mail (EmailJS)

Les e-mails partent du navigateur de la personne qui affecte la tâche, via [EmailJS](https://www.emailjs.com) : pas de serveur,
pas de forfait Firebase payant. Ils sont envoyés quand on **affecte une tâche à quelqu'un** (responsable) ou qu'on
**l'ajoute comme aidant**, sauf à soi-même, et seulement si le destinataire n'a pas désactivé l'option dans *Mon profil*.

1. Créer un compte EmailJS, puis **Email Services** > connecter une boîte d'envoi (Gmail, etc.) → `serviceId`.
2. **Email Templates** > nouveau modèle, champ *To email* : `{{to_email}}`. Paramètres disponibles :
   `to_name`, `from_name`, `role`, `task_title`, `task_description`, `due_date`, `task_url`.
3. **Account** > clé publique → `publicKey`. Dans *Security*, limiter les domaines autorisés (localhost, domaine Hosting).
4. Renseigner `emailjs` dans `src/environments/environment.ts`.

Limites : le plan gratuit est plafonné (200 e-mails/mois) ; un e-mail ne part que si quelqu'un agit dans l'application
(pas de rappels automatiques d'échéance, qui demanderaient un serveur).

## Personnes sans compte

Une fiche « sans compte » (`mock-…`) permet d'affecter des tâches à quelqu'un qui n'a pas encore créé son compte Google.
Quand la personne s'est connectée et que son compte est approuvé : page **Membres** > *Personnes sans compte* >
choisir le vrai compte > **Remplacer**. Ses tâches, son rôle d'aidant et ses commissions sont transférés, puis la fiche
est supprimée. *Supprimer* libère simplement ses tâches.
