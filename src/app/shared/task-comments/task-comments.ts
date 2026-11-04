import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CommentService } from '../../core/data/comment.service';
import { MemberService } from '../../core/data/member.service';
import { uniqueId } from '../../core/utils/unique-id';
import { Avatar } from '../avatar/avatar';

@Component({
  selector: 'app-task-comments',
  imports: [Avatar, DatePipe, ReactiveFormsModule],
  templateUrl: './task-comments.html',
  styleUrl: './task-comments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskComments {
  private readonly auth = inject(AuthService);
  private readonly commentService = inject(CommentService);
  private readonly memberService = inject(MemberService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly taskId = input.required<string>();
  // Admin ou créateur de la tâche : peut retirer le commentaire de n'importe qui.
  readonly canModerate = input(false);

  protected readonly id = uniqueId('comment');
  protected readonly error = signal<string | null>(null);

  private readonly comments = toSignal(
    toObservable(this.taskId).pipe(switchMap((taskId) => this.commentService.comments$(taskId))),
    { initialValue: [] },
  );

  protected readonly rows = computed(() =>
    this.comments().map((comment) => {
      const profile = this.memberService.profiles().get(comment.authorUid);
      return {
        id: comment.id,
        text: comment.text,
        name: profile?.displayName ?? comment.authorName,
        photo: profile?.photoURL ?? null,
        date: comment.createdAt?.toDate() ?? null,
        removable: this.canModerate() || comment.authorUid === this.auth.uid(),
      };
    }),
  );

  protected readonly form = this.formBuilder.group({
    text: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  protected async submit(): Promise<void> {
    const text = this.form.controls.text.value.trim();
    if (!text) return;
    this.error.set(null);
    try {
      await this.commentService.add(this.taskId(), text);
      this.form.reset();
    } catch {
      this.error.set("Le commentaire n'a pas pu être publié.");
    }
  }

  protected async remove(commentId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.commentService.remove(this.taskId(), commentId);
    } catch {
      this.error.set("Le commentaire n'a pas pu être supprimé.");
    }
  }
}
