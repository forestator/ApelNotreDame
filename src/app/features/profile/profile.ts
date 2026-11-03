import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { resizeToSquareDataUrl } from '../../core/utils/image-resize';
import { Avatar } from '../../shared/avatar/avatar';

@Component({
  selector: 'app-profile',
  imports: [Avatar, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly member = this.auth.member;
  protected readonly googlePhoto = this.auth.googlePhotoURL;
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    emailNotifications: [true],
  });

  constructor() {
    // La route est protégée par le guard : la fiche membre est déjà chargée.
    const member = this.member();
    if (member) {
      this.form.setValue({
        displayName: member.displayName,
        emailNotifications: member.emailNotifications ?? true,
      });
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) return;
    const { displayName, emailNotifications } = this.form.getRawValue();
    await this.run(() => this.auth.updateProfile({ displayName: displayName.trim(), emailNotifications }), 'Profil enregistré.');
  }

  protected async choosePhoto(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) return;
    await this.run(async () => this.auth.updateProfile({ photoURL: await resizeToSquareDataUrl(file) }), 'Photo mise à jour.');
  }

  protected useGooglePhoto(): Promise<void> {
    return this.run(() => this.auth.updateProfile({ photoURL: this.googlePhoto() }), 'Photo Google rétablie.');
  }

  protected removePhoto(): Promise<void> {
    return this.run(() => this.auth.updateProfile({ photoURL: null }), 'Photo supprimée.');
  }

  private async run(action: () => Promise<void>, success: string): Promise<void> {
    this.message.set(null);
    this.error.set(null);
    try {
      await action();
      this.message.set(success);
    } catch {
      this.error.set("L'opération a échoué. Vérifiez votre connexion et réessayez.");
    }
  }
}
