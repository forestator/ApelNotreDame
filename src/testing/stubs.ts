import { computed, signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../app/core/auth/auth.service';
import { MemberService } from '../app/core/data/member.service';
import { NotificationService } from '../app/core/data/notification.service';
import { ProjectService } from '../app/core/data/project.service';
import { TaskService } from '../app/core/data/task.service';
import { Member } from '../app/core/models/member';
import { Project } from '../app/core/models/project';
import { Task } from '../app/core/models/task';

export const ME: Member = {
  uid: 'me',
  displayName: 'Maximilien',
  email: 'max@example.org',
  photoURL: null,
  role: 'member',
  status: 'approved',
};

export const KEVIN: Member = { ...ME, uid: 'mock-kevin', displayName: 'Kevin', email: '', mock: true };

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Montage du chapiteau',
    description: '',
    date: null,
    time: null,
    needed: 0,
    extraPeople: 0,
    participants: {},
    createdBy: 'someone',
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: 'project-1', name: 'Cirque', description: '', color: 'red', dueDate: null, ...overrides };
}

/** Remplace les services branchés sur Firebase par des doubles en mémoire, pour afficher les composants en test. */
export function appStubs(options: { tasks?: Task[]; projects?: Project[]; members?: Member[]; isAdmin?: boolean; loaded?: boolean } = {}) {
  const members = options.members ?? [ME, KEVIN];
  const auth = {
    member: signal<Member | null>(ME),
    uid: signal<string | null>(ME.uid),
    isAdmin: signal(options.isAdmin ?? false),
    status: signal('approved'),
  };
  const taskService = {
    loaded: signal(options.loaded ?? true),
    tasks: signal(options.tasks ?? []),
    forProject$: () => of(options.tasks ?? []),
    register: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const projects = options.projects ?? [makeProject()];
  const projectService = {
    loaded: signal(options.loaded ?? true),
    projects: signal(projects),
    project$: (id: string) => of(projects.find((project) => project.id === id)),
  };
  const memberService = {
    loaded: signal(options.loaded ?? true),
    members: signal(members),
    approved: computed(() => members),
    realApproved: computed(() => members.filter((member) => !member.mock)),
    placeholders: computed(() => members.filter((member) => member.mock)),
    pending: computed(() => []),
    profiles: computed(() => new Map(members.map((member) => [member.uid, member]))),
  };
  const notifications = { notifyRegistered: vi.fn().mockResolvedValue(undefined) };

  return {
    auth,
    taskService,
    notifications,
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: TaskService, useValue: taskService },
      { provide: ProjectService, useValue: projectService },
      { provide: MemberService, useValue: memberService },
      { provide: NotificationService, useValue: notifications },
    ],
  };
}
