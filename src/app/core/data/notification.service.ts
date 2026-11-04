import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Member } from '../models/member';
import { Task } from '../models/task';
import { longDayLabel } from '../utils/calendar-math';
import { formatTime } from '../utils/french-time';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/** Envoie les e-mails de notification depuis le navigateur de la personne qui agit (via EmailJS, sans serveur). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);

  /** Prévient quelqu'un qu'un autre membre vient de l'inscrire à une tâche. */
  async notifyRegistered(recipient: Member, task: Task, projectName?: string): Promise<void> {
    const actor = this.auth.member();
    const { serviceId, templateId, publicKey } = environment.emailjs;
    if (!serviceId || !templateId || !publicKey) return;
    if (!actor || actor.uid === recipient.uid) return;
    if (!recipient.email || recipient.emailNotifications === false) return;

    const when = [task.date ? longDayLabel(task.date) : 'Date à confirmer', formatTime(task.time)]
      .filter(Boolean)
      .join(' à ');

    try {
      await fetch(EMAILJS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: recipient.email,
            to_name: recipient.displayName,
            from_name: actor.displayName,
            task_title: task.title,
            task_when: when,
            project_name: projectName ?? '',
            task_description: task.description,
            task_url: `${location.origin}/projets/${task.projectId}`,
          },
        }),
      });
    } catch {
      // L'e-mail est un confort : un échec réseau ne doit jamais bloquer l'inscription.
    }
  }
}
