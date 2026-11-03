import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Member } from '../models/member';
import { Task } from '../models/task';
import { isoToFrenchDate } from '../utils/french-date';

export type AssignmentRole = 'responsable' | 'aidant';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/** Envoie les e-mails de notification depuis le navigateur de la personne qui agit (via EmailJS, sans serveur). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);

  async notifyAssignment(recipient: Member, task: Task, role: AssignmentRole): Promise<void> {
    const actor = this.auth.member();
    const { serviceId, templateId, publicKey } = environment.emailjs;
    if (!serviceId || !templateId || !publicKey) return;
    if (!actor || actor.uid === recipient.uid) return;
    if (!recipient.email || recipient.emailNotifications === false) return;

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
            role,
            task_title: task.title,
            task_description: task.description,
            due_date: isoToFrenchDate(task.dueDate),
            task_url: `${location.origin}/commissions/${task.commissionId}`,
          },
        }),
      });
    } catch {
      // L'e-mail est un confort : un échec réseau ne doit jamais bloquer l'affectation.
    }
  }
}
