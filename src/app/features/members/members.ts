import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { MemberService } from '../../core/data/member.service';
import { Member } from '../../core/models/member';
import { Avatar } from '../../shared/avatar/avatar';

type PlaceholderAction = { uid: string; kind: 'replace' | 'release' };

@Component({
  selector: 'app-members',
  imports: [Avatar, ReactiveFormsModule],
  templateUrl: './members.html',
  styleUrl: './members.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Members {
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly pending = this.memberService.pending;
  protected readonly placeholders = this.memberService.placeholders;
  protected readonly realMembers = this.memberService.realApproved;
  protected readonly confirmingUid = signal<string | null>(null);
  protected readonly targets = signal<Record<string, string>>({});
  protected readonly placeholderAction = signal<PlaceholderAction | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly placeholderForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
  });

  // Chaque ligne porte déjà son état « c'est moi », pour ne pas appeler de fonction dans le template.
  protected readonly approved = computed(() =>
    this.realMembers().map((member) => ({ member, isSelf: member.uid === this.auth.uid() })),
  );

  protected approve(member: Member): Promise<void> {
    return this.memberService.approve(member.uid);
  }

  protected askRemoval(member: Member): void {
    this.confirmingUid.set(member.uid);
  }

  protected cancelRemoval(): void {
    this.confirmingUid.set(null);
  }

  protected async reject(member: Member): Promise<void> {
    await this.memberService.remove(member.uid);
    this.confirmingUid.set(null);
  }

  protected toggleAdmin(member: Member): Promise<void> {
    return this.memberService.setRole(member.uid, member.role === 'admin' ? 'member' : 'admin');
  }

  protected async addPlaceholder(): Promise<void> {
    if (this.placeholderForm.invalid) return;
    this.error.set(null);
    try {
      await this.memberService.addPlaceholder(this.placeholderForm.controls.name.value.trim());
      this.placeholderForm.reset();
    } catch {
      this.error.set("La personne n'a pas pu être ajoutée.");
    }
  }

  protected chooseTarget(placeholderUid: string, realUid: string): void {
    this.targets.update((current) => ({ ...current, [placeholderUid]: realUid }));
  }

  protected askPlaceholderAction(uid: string, kind: PlaceholderAction['kind']): void {
    this.placeholderAction.set({ uid, kind });
  }

  protected cancelPlaceholderAction(): void {
    this.placeholderAction.set(null);
  }

  protected async confirmPlaceholderAction(placeholder: Member): Promise<void> {
    const action = this.placeholderAction();
    if (!action) return;
    const target = action.kind === 'replace' ? this.realMembers().find((m) => m.uid === this.targets()[placeholder.uid]) : undefined;
    if (action.kind === 'replace' && !target) return;
    this.error.set(null);
    try {
      await this.memberService.retirePlaceholder(placeholder.uid, target);
      this.placeholderAction.set(null);
    } catch {
      this.error.set("L'opération a échoué. Réessayez.");
    }
  }
}
