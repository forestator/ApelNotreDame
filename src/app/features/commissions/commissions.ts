import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CommissionService } from '../../core/data/commission.service';
import { TaskService } from '../../core/data/task.service';
import { toneClass } from '../../core/models/tone';
import { MemberService } from '../../core/data/member.service';
import { Progress } from '../../shared/progress/progress';
import { Modal } from '../../shared/modal/modal';
import { CommissionForm } from '../../shared/commission-form/commission-form';

@Component({
  selector: 'app-commissions',
  imports: [CommissionForm, Modal, Progress, RouterLink],
  templateUrl: './commissions.html',
  styleUrl: './commissions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Commissions {
  private readonly commissionService = inject(CommissionService);
  private readonly taskService = inject(TaskService);

  private readonly memberService = inject(MemberService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly adding = signal(false);

  protected readonly cards = computed(() => {
    const tasks = this.taskService.tasks();
    return this.commissionService.commissions().map((commission) => {
      const own = tasks.filter((task) => task.commissionId === commission.id);
      const open = own.filter((task) => task.status !== 'done').length;
      const free = own.filter((task) => task.status !== 'done' && task.assigneeUid === null).length;
      const done = own.length - open;
      const leadName = (commission.leadUid && this.memberService.profiles().get(commission.leadUid)?.displayName) || commission.leadName;
      return { commission, open, free, done, total: own.length, leadName, tone: toneClass(commission.color) };
    });
  });

  protected startAdding(): void {
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }
}
