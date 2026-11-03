import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CommissionService } from '../../core/data/commission.service';
import { toneClass } from '../../core/models/tone';
import { MemberService } from '../../core/data/member.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { Progress } from '../../shared/progress/progress';
import { Modal } from '../../shared/modal/modal';
import { CommissionForm } from '../../shared/commission-form/commission-form';
import { TaskForm } from '../../shared/task-form/task-form';
import { TaskItem } from '../../shared/task-item/task-item';

@Component({
  selector: 'app-commission-detail',
  imports: [CommissionForm, Modal, Progress, RouterLink, TaskForm, TaskItem],
  templateUrl: './commission-detail.html',
  styleUrl: './commission-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommissionDetail {
  private readonly auth = inject(AuthService);
  private readonly commissionService = inject(CommissionService);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);

  // Alimenté par le paramètre de route :id (withComponentInputBinding).
  readonly id = input.required<string>();

  protected readonly isAdmin = this.auth.isAdmin;
  private readonly memberService = inject(MemberService);
  protected readonly members = this.memberService.approved;
  protected readonly projects = inject(ProjectService).projects;
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingRemoval = signal(false);
  protected readonly editing = signal(false);
  protected readonly adding = signal(false);

  protected readonly commission = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => this.commissionService.commission$(id)),
      // undefined = en chargement, null = introuvable
      map((commission) => commission ?? null),
    ),
  );
  private readonly commissionTasks = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.taskService.forCommission$(id))),
    { initialValue: [] },
  );

  protected readonly canManage = computed(
    () => this.isAdmin() || (this.commission()?.leadUid ?? null) === this.auth.uid(),
  );

  // Le nom à jour du membre prime sur celui copié dans la commission.
  protected readonly leadName = computed(() => {
    const commission = this.commission();
    const profile = commission?.leadUid ? this.memberService.profiles().get(commission.leadUid) : undefined;
    return profile?.displayName ?? commission?.leadName ?? null;
  });

  private readonly projectNames = computed(() => new Map(this.projects().map((project) => [project.id, project.name])));

  protected readonly tone = computed(() => toneClass(this.commission()?.color));
  protected readonly doneCount = computed(() => this.commissionTasks().filter((task) => task.status === 'done').length);
  protected readonly totalCount = computed(() => this.commissionTasks().length);

  // Les tâches terminées passent en bas de liste.
  protected readonly rows = computed(() =>
    [...this.commissionTasks()]
      .sort((first, second) => Number(first.status === 'done') - Number(second.status === 'done'))
      .map((task) => ({ task, projectName: task.projectId ? this.projectNames().get(task.projectId) : undefined })),
  );

  protected async setLead(uid: string): Promise<void> {
    const lead = this.members().find((member) => member.uid === uid);
    await this.commissionService.update(this.id(), {
      leadUid: lead?.uid ?? null,
      leadName: lead?.displayName ?? null,
    });
  }

  protected startAdding(): void {
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }

  protected startEditing(): void {
    this.editing.set(true);
  }

  protected stopEditing(): void {
    this.editing.set(false);
  }

  protected askRemoval(): void {
    this.confirmingRemoval.set(true);
  }

  protected cancelRemoval(): void {
    this.confirmingRemoval.set(false);
  }

  protected async removeCommission(): Promise<void> {
    try {
      await this.commissionService.remove(this.id());
    } catch {
      this.error.set("La commission n'a pas pu être supprimée.");
      this.confirmingRemoval.set(false);
      return;
    }
    await this.router.navigateByUrl('/commissions');
  }
}
