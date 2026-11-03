import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { uniqueId } from '../../core/utils/unique-id';

/**
 * Fenêtre modale basée sur <dialog> (focus piégé, Échap et fond gérés par le navigateur).
 * Le parent l'affiche avec @if et la retire à l'événement `closed`.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal implements OnDestroy {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly titleId = uniqueId('modal-title');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  ngOnDestroy(): void {
    // Fermer explicitement rend le focus au bouton qui a ouvert la fenêtre.
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
