import { Tone } from './tone';

export interface Commission {
  id: string;
  name: string;
  description: string;
  color?: Tone;
  leadUid: string | null;
  leadName: string | null;
}

export type NewCommission = Omit<Commission, 'id'>;
