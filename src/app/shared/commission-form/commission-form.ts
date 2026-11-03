import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommissionService } from '../../core/data/commission.service';
import { Commission } from '../../core/models/commission';
import { Tone } from '../../core/models/tone';
import { TonePicker } from '../tone-picker/tone-picker';
import { uniqueId } from '../../core/utils/unique-id';

/** Création d'une commission, ou modification si `commission` est renseignée. */
@Component({
  selector: 'app-commission-form',
  imports: [ReactiveFormsModule, TonePicker],
  templateUrl: './commission-form.html',
  styleUrl: './commission-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommissionForm implements OnInit {
  private readonly commissionService = inject(CommissionService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly commission = input<Commission>();
  readonly done = output<void>();

  protected readonly id = uniqueId('commission-form');
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
    color: ['teal' as Tone],
  });

  ngOnInit(): void {
    const commission = this.commission();
    if (commission) {
      this.form.setValue({
        name: commission.name,
        description: commission.description,
        color: commission.color ?? 'teal',
      });
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    const values = this.form.getRawValue();
    const commission = this.commission();
    try {
      if (commission) {
        await this.commissionService.update(commission.id, values);
        this.done.emit();
      } else {
        await this.commissionService.add({ ...values, leadUid: null, leadName: null });
        this.form.reset();
        this.done.emit();
      }
    } catch {
      this.error.set(commission ? "La commission n'a pas pu être modifiée." : "La commission n'a pas pu être créée.");
    }
  }
}
