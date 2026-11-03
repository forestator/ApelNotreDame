import { Tone } from './tone';

export interface Project {
  id: string;
  name: string;
  description: string;
  color?: Tone;
  dueDate: string | null;
}

export type NewProject = Omit<Project, 'id'>;
