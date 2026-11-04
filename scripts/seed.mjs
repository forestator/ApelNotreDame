// Import de départ, avec les droits administrateur Firebase.
// Usage : node --experimental-strip-types scripts/seed.mjs [--dry-run] [--placeholders] [--replace-tasks]
//
//   (sans option)    crée les projets manquants et leurs tâches. Les projets existants ne sont jamais retouchés.
//   --placeholders   crée les fiches « sans compte » si elles n'existent pas (à ne lancer qu'une fois :
//                    une fiche supprimée après remplacement serait sinon recréée).
//   --replace-tasks  supprime TOUTES les tâches existantes (et leurs commentaires) puis recrée celles du fichier.
//                    Refuse de s'exécuter si quelqu'un d'autre que l'admin a créé une tâche.
//
// Les données viennent de scripts/seed-data.ts (non versionné : il contient des informations privées).
// Clé de compte de service : $GOOGLE_APPLICATION_CREDENTIALS ou ~/.config/apel/service-account.json
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SEED_PLACEHOLDERS, SEED_PROJECTS, SEED_TASKS } from './seed-data.ts';

const dryRun = process.argv.includes('--dry-run');
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? join(homedir(), '.config/apel/service-account.json');
if (!existsSync(keyPath)) {
  console.error(`Clé de compte de service introuvable : ${keyPath}`);
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const admins = await db.collection('members').where('role', '==', 'admin').where('status', '==', 'approved').get();
if (admins.empty) {
  console.error("Aucun admin approuvé dans 'members' : connecte-toi une fois à l'app puis passe ton compte en admin.");
  process.exit(1);
}
const importer = admins.docs[0].data();
const slug = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

if (process.argv.includes('--placeholders')) {
  for (const name of SEED_PLACEHOLDERS) {
    const ref = db.doc(`members/mock-${slug(name)}`);
    if ((await ref.get()).exists) continue;
    console.log(`  + fiche sans compte : ${name}`);
    if (!dryRun) {
      await ref.set({ uid: ref.id, displayName: name, email: '', photoURL: null, role: 'member', status: 'approved', mock: true });
    }
  }
}

const people = new Map([['@importer', importer]]);
for (const name of SEED_PLACEHOLDERS) {
  const snapshot = await db.doc(`members/mock-${slug(name)}`).get();
  if (snapshot.exists) people.set(name, snapshot.data());
}

// Projets : on garde ceux qui existent, on crée les autres.
const projectIds = new Map();
const createdProjects = new Set();
for (const project of SEED_PROJECTS) {
  const snapshot = await db.collection('projects').where('name', '==', project.name).limit(1).get();
  if (!snapshot.empty) {
    projectIds.set(project.name, snapshot.docs[0].id);
    continue;
  }
  console.log(`  + projet : ${project.name}`);
  const ref = db.collection('projects').doc();
  if (!dryRun) await ref.set({ name: project.name, description: project.description, color: project.color, dueDate: project.dueDate });
  projectIds.set(project.name, ref.id);
  createdProjects.add(project.name);
}

if (process.argv.includes('--replace-tasks')) {
  const existing = await db.collection('tasks').get();
  const foreign = existing.docs.filter((task) => task.data().createdBy !== importer.uid);
  if (foreign.length) {
    console.error(`Abandon : ${foreign.length} tâche(s) ont été créées par quelqu'un d'autre, rien n'a été supprimé.`);
    process.exit(2);
  }
  let comments = 0;
  for (const task of existing.docs) comments += (await task.ref.collection('comments').get()).size;
  console.log(`  - ${existing.size} tâche(s) et ${comments} commentaire(s) à supprimer`);
  if (!dryRun) {
    for (const task of existing.docs) {
      const batch = db.batch();
      (await task.ref.collection('comments').get()).forEach((comment) => batch.delete(comment.ref));
      batch.delete(task.ref);
      await batch.commit();
    }
  }
}

const replace = process.argv.includes('--replace-tasks');
let created = 0;
for (const task of SEED_TASKS) {
  if (!replace && !createdProjects.has(task.project)) continue; // jamais de tâche ajoutée à un projet existant
  const participants = {};
  for (const name of task.participants) {
    const person = people.get(name);
    if (person) participants[person.uid] = person.displayName;
    else console.log(`  ! ${name} : fiche introuvable, ignoré`);
  }
  created++;
  console.log(`  + tâche : ${task.title}`);
  if (dryRun) continue;
  await db.collection('tasks').add({
    projectId: projectIds.get(task.project),
    title: task.title,
    description: task.description,
    date: task.date,
    time: task.time,
    needed: task.needed,
    extraPeople: task.extraPeople,
    participants,
    createdBy: importer.uid,
  });
}
console.log(`${created} tâche(s) ${dryRun ? 'à créer' : 'créée(s)'} (importeur : ${importer.displayName}).`);
if (dryRun) console.log("Simulation terminée, rien n'a été écrit.");
