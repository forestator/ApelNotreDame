// Import de la saison depuis la console, avec les droits administrateur Firebase.
// Usage : node --experimental-strip-types scripts/seed.mjs [--dry-run] [--placeholders] [--assign]
//   --placeholders : crée les fiches « sans compte » (prénoms de la conversation) si elles n'existent pas.
//                    À ne lancer qu'une fois : une fiche supprimée après remplacement serait sinon recréée.
//   --assign       : remplit les responsables de commission et d'tâches encore vides (jamais d'écrasement).
// N'importe que du neuf : les commissions et projets existants sont conservés tels quels, et leurs tâches ne sont jamais
// recréées (une tâche supprimée dans l'application le reste).
// Clé de compte de service : $GOOGLE_APPLICATION_CREDENTIALS ou ~/.config/apel/service-account.json
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SEED_ASSIGNMENTS, SEED_COMMISSIONS, SEED_LEADS, SEED_PLACEHOLDERS, SEED_PROJECTS, SEED_TASKS } from '../src/app/core/data/seed-data.ts';

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

/** Retourne l'id du document de même nom, en le créant s'il n'existe pas. */
const createdCommissionIds = new Set();

async function ensureByName(collectionName, seed) {
  const snapshot = await db.collection(collectionName).where('name', '==', seed.name).limit(1).get();
  if (!snapshot.empty) {
    // Rattrape la couleur des commissions importées avant son introduction, sans écraser un choix existant.
    const existing = snapshot.docs[0];
    if (seed.data.color && existing.data().color === undefined) {
      console.log(`  ~ ${collectionName} : couleur de ${seed.name}`);
      if (!dryRun) await existing.ref.update({ color: seed.data.color });
    }
    return existing.id;
  }
  console.log(`  + ${collectionName} : ${seed.name}`);
  const ref = db.collection(collectionName).doc();
  if (!dryRun) await ref.set(seed.data);
  if (collectionName === 'commissions') createdCommissionIds.add(ref.id);
  return ref.id;
}

const commissionIds = new Map();
for (const { name, description, color, leadIsImporter } of SEED_COMMISSIONS) {
  const lead = leadIsImporter ? { leadUid: importer.uid, leadName: importer.displayName } : { leadUid: null, leadName: null };
  commissionIds.set(name, await ensureByName('commissions', { name, data: { name, description, color, ...lead } }));
}
const projectIds = new Map();
for (const { name, description, color, dueDate } of SEED_PROJECTS) {
  projectIds.set(name, await ensureByName('projects', { name, data: { name, description, color, dueDate } }));
}

const existingTasks = new Set((await db.collection('tasks').get()).docs.map((snapshot) => `${snapshot.data().commissionId}|${snapshot.data().title}`));
let created = 0;
for (const task of SEED_TASKS) {
  const commissionId = commissionIds.get(task.commission);
  // Une commission déjà présente n'est pas retouchée : on ne remet pas des tâches que quelqu'un a pu supprimer.
  if (!createdCommissionIds.has(commissionId) || existingTasks.has(`${commissionId}|${task.title}`)) continue;
  created++;
  if (dryRun) continue;
  await db.collection('tasks').add({
    commissionId,
    projectId: task.project ? projectIds.get(task.project) : null,
    title: task.title,
    description: task.description,
    status: task.status,
    assigneeUid: task.assignToImporter ? importer.uid : null,
    assigneeName: task.assignToImporter ? importer.displayName : null,
    helpers: {},
    helpersNeeded: task.helpersNeeded ?? 0,
    dueDate: task.dueDate,
    createdBy: importer.uid,
  });
}

const slug = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

if (process.argv.includes('--placeholders')) {
  for (const name of SEED_PLACEHOLDERS) {
    const ref = db.doc(`members/mock-${slug(name)}`);
    if ((await ref.get()).exists) continue;
    console.log(`  + fiche sans compte : ${name}`);
    if (!dryRun) {
      await ref.set({ uid: ref.id, displayName: name, email: '', photoURL: null, role: 'member', status: 'approved', emailNotifications: false, mock: true });
    }
  }
}

if (process.argv.includes('--assign')) {
  const people = new Map([['@importer', importer]]);
  for (const name of SEED_PLACEHOLDERS) {
    const snapshot = await db.doc(`members/mock-${slug(name)}`).get();
    if (snapshot.exists) people.set(name, snapshot.data());
  }
  const personFor = (name) => {
    const person = people.get(name);
    if (!person) console.log(`  ! ${name} : fiche introuvable (déjà remplacée ?), ignoré`);
    return person;
  };

  for (const [commissionName, leadName] of Object.entries(SEED_LEADS)) {
    const snapshot = await db.collection('commissions').where('name', '==', commissionName).limit(1).get();
    const lead = personFor(leadName);
    if (snapshot.empty || !lead || snapshot.docs[0].data().leadUid) continue;
    console.log(`  > responsable de ${commissionName} : ${leadName}`);
    if (!dryRun) await snapshot.docs[0].ref.update({ leadUid: lead.uid, leadName: lead.displayName });
  }

  const taskDocs = (await db.collection('tasks').get()).docs;
  for (const assignment of SEED_ASSIGNMENTS) {
    const commissionId = commissionIds.get(assignment.commission);
    const doc = taskDocs.find((candidate) => candidate.data().commissionId === commissionId && candidate.data().title === assignment.title);
    if (!doc) continue; // tâche supprimée ou renommée dans l'application : on n'y touche pas
    const changes = {};
    const assignee = assignment.assignee && personFor(assignment.assignee);
    if (assignee && !doc.data().assigneeUid) {
      changes.assigneeUid = assignee.uid;
      changes.assigneeName = assignee.displayName;
    }
    for (const helperName of assignment.helpers ?? []) {
      const helper = personFor(helperName);
      if (helper && !(doc.data().helpers ?? {})[helper.uid]) changes[`helpers.${helper.uid}`] = helper.displayName;
    }
    if (!Object.keys(changes).length) continue;
    console.log(`  > ${assignment.title.slice(0, 55)} : ${Object.values(changes).join(', ')}`);
    if (!dryRun) await doc.ref.update(changes);
  }
}

console.log(`${created} tâche(s) ${dryRun ? 'à créer' : 'créée(s)'} (importeur : ${importer.displayName}).`);
if (dryRun) console.log("Simulation terminée, rien n'a été écrit.");
