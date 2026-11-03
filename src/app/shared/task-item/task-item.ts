import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CommissionService } from '../../core/data/commission.service';
import { MemberService } from '../../core/data/member.service';
import { NotificationService } from '../../core/data/notification.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { toneClass } from '../../core/models/tone';
import { Task, TASK_STATUS_LABELS, TaskStatus } from '../../core/models/task';
import { uniqueId } from '../../core/utils/unique-id';
import { Avatar } from '../avatar/avatar';
import { TaskComments } from '../task-comments/task-comments';
import { TaskForm } from '../task-form/task-form';

@Component({
  selector: 'app-task-item',
  imports: [Avatar, DatePipe, RouterLink, TaskComments, TaskForm],
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskItem {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly memberService = inject(MemberService);
  private readonly notifications = inject(NotificationService);

  readonly task = input.required<Task>();
  readonly commissionName = input<string>();
  readonly projectName = input<string>();
  // Responsable de la commission ou admin : peut tout modifier sur la tâche.
  readonly canManage = input(false);

  protected readonly menuId = uniqueId('task-menu');
  protected readonly commentsId = uniqueId('task-comments');
  protected readonly members = this.memberService.approved;
  protected readonly commissions = inject(CommissionService).commissions;
  protected readonly projects = inject(ProjectService).projects;
  protected readonly editing = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly confirmingRemoval = signal(false);
  protected readonly commentsOpen = signal(false);
  protected readonly commentCount = computed(() => this.task().commentCount ?? 0);

  protected readonly statusOptions = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((value) => ({
    value,
    label: TASK_STATUS_LABELS[value],
  }));

  protected readonly commissionTone = computed(() =>
    toneClass(this.commissions().find((commission) => commission.id === this.task().commissionId)?.color),
  );
  protected readonly projectTone = computed(() =>
    toneClass(this.projects().find((project) => project.id === this.task().projectId)?.color),
  );
  protected readonly statusLabel = computed(() => TASK_STATUS_LABELS[this.task().status]);
  protected readonly statusClass = computed(() => `badge-${this.task().status}`);
  protected readonly stripeClass = computed(() => `task-${this.task().status}`);
  protected readonly isFree = computed(() => this.task().assigneeUid === null);
  protected readonly isMine = computed(() => this.task().assigneeUid === this.auth.uid());

  private readonly assignee = computed(() => {
    const uid = this.task().assigneeUid;
    return uid ? this.memberService.profiles().get(uid) : undefined;
  });
  protected readonly assigneeName = computed(() => this.assignee()?.displayName ?? this.task().assigneeName ?? '');
  protected readonly assigneePhoto = computed(() => this.assignee()?.photoURL ?? null);

  // Mêmes périmètres que les règles Firestore.
  protected readonly canEditStatus = computed(() => this.isMine() || this.canManage());
  protected readonly canEdit = computed(() => this.isMine() || this.canManage());
  // N'importe quel membre peut affecter une tâche libre ; ensuite seuls le titulaire et les responsables peuvent la réaffecter.
  protected readonly canAssign = computed(() => this.isFree() || this.isMine() || this.canManage());
  // Le titulaire et les responsables peuvent ajouter d'autres aidants ; chacun peut s'inscrire lui-même.
  protected readonly canManageHelpers = computed(() => this.isMine() || this.canManage());

  private readonly helperMap = computed(() => this.task().helpers ?? {});

  protected readonly helperEntries = computed(() =>
    Object.entries(this.helperMap()).map(([uid, storedName]) => {
      const profile = this.memberService.profiles().get(uid);
      return {
        uid,
        name: profile?.displayName ?? storedName,
        photo: profile?.photoURL ?? null,
        removable: this.canManageHelpers() || uid === this.auth.uid(),
      };
    }),
  );
  protected readonly helpersNeeded = computed(() => this.task().helpersNeeded ?? 0);
  protected readonly helpersMissing = computed(() => Math.max(this.helpersNeeded() - this.helperEntries().length, 0));
  protected readonly isHelper = computed(() => this.auth.uid() !== null && this.auth.uid()! in this.helperMap());
  protected readonly canJoin = computed(() => !this.isHelper() && !this.isMine());
  protected readonly addableHelpers = computed(() =>
    this.members().filter((member) => member.uid !== this.task().assigneeUid && !(member.uid in this.helperMap())),
  );

  // Une seule action principale visible sur la carte ; le reste est rangé dans « Gérer ».
  protected readonly primaryAction = computed<'take' | 'join' | null>(() => {
    if (this.isFree()) return 'take';
    return this.canJoin() && this.helpersMissing() > 0 ? 'join' : null;
  });
  protected readonly joinInMenu = computed(() => this.canJoin() && this.primaryAction() !== 'join');
  protected readonly hasMenu = computed(
    () =>
      this.canAssign() ||
      this.canEdit() ||
      this.canManage() ||
      this.joinInMenu() ||
      (this.canManageHelpers() && this.addableHelpers().length > 0),
  );

  protected toggleComments(): void {
    this.commentsOpen.update((open) => !open);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.confirmingRemoval.set(false);
  }

  protected join(): Promise<void> {
    const member = this.auth.member();
    return member ? this.taskService.addHelper(this.task().id, member) : Promise.resolve();
  }

  protected async addHelper(uid: string): Promise<void> {
    const member = this.members().find((candidate) => candidate.uid === uid);
    if (!member) return;
    await this.taskService.addHelper(this.task().id, member);
    await this.notifications.notifyAssignment(member, this.task(), 'aidant');
  }

  protected removeHelper(uid: string): Promise<void> {
    return this.taskService.removeHelper(this.task().id, uid);
  }

  protected startEditing(): void {
    this.menuOpen.set(false);
    this.editing.set(true);
  }

  protected stopEditing(): void {
    this.editing.set(false);
  }

  protected take(): Promise<void> {
    const member = this.auth.member();
    if (!member) return Promise.resolve();
    return this.taskService.take(this.task().id, member.uid, member.displayName);
  }

  protected async assign(uid: string): Promise<void> {
    const member = this.members().find((candidate) => candidate.uid === uid);
    if (!member) {
      await this.taskService.release(this.task().id);
      return;
    }
    await this.taskService.assign(this.task().id, member);
    await this.notifications.notifyAssignment(member, this.task(), 'responsable');
  }

  protected setStatus(status: string): Promise<void> {
    return this.taskService.setStatus(this.task().id, status as TaskStatus);
  }

  protected askRemoval(): void {
    this.confirmingRemoval.set(true);
  }

  protected cancelRemoval(): void {
    this.confirmingRemoval.set(false);
  }

  protected remove(): Promise<void> {
    return this.taskService.remove(this.task().id);
  }
}
