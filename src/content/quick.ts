import { topics } from './catalogue';
export const quickPool = topics.flatMap(topic => topic.prompts.filter(prompt => prompt.quickEligible).map(prompt => ({ topic, prompt })));
/** Exhaust this seven-question pool before repeating. History is session-local in the baseline. */
export function nextQuickId(history: readonly string[], random = Math.random): string {
  const ids = quickPool.map(entry => entry.prompt.id);
  const remaining = ids.filter(id => !history.slice(-ids.length).includes(id));
  const pool = remaining.length ? remaining : ids.filter(id => id !== history.at(-1));
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? ids[0];
}
