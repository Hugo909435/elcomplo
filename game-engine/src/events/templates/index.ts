import { EventTemplate } from '../types';
import { ECONOMY_TEMPLATES } from './economy';
import { WAR_TEMPLATES } from './war';
import { RELIGION_TEMPLATES } from './religion';
import { PEOPLE_TEMPLATES } from './people';
import { POLITICS_TEMPLATES } from './politics';
import { CHAOS_TEMPLATES } from './chaos';

export const ALL_TEMPLATES: EventTemplate[] = [
  ...ECONOMY_TEMPLATES,
  ...WAR_TEMPLATES,
  ...RELIGION_TEMPLATES,
  ...PEOPLE_TEMPLATES,
  ...POLITICS_TEMPLATES,
  ...CHAOS_TEMPLATES,
];

export {
  ECONOMY_TEMPLATES,
  WAR_TEMPLATES,
  RELIGION_TEMPLATES,
  PEOPLE_TEMPLATES,
  POLITICS_TEMPLATES,
  CHAOS_TEMPLATES,
};
