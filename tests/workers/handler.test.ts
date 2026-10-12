import { describe, expect, it } from 'vitest';
import { handleRequest } from '../../src/workers/handler';
import type { WorkerResponse } from '../../src/workers/messages';

const run = (request: Parameters<typeof handleRequest>[0]) => {
  const messages: WorkerResponse[] = [];
  handleRequest(request, (message) => messages.push(message));
  return messages;
};

describe('handleRequest', () => {
  it('calcule un alignement à trois séquences et envoie la progression', () => {
    const messages = run({ id: 1, method: 'triple', sequences: ['ACGT', 'AGT', 'ACT'] });
    expect(messages.filter((m) => m.type === 'progress').length).toBeGreaterThan(0);
    const last = messages.at(-1)!;
    expect(last.type).toBe('result');
    if (last.type === 'result') expect(last.result.kind).toBe('triple');
  });

  it('calcule un alignement 1v1', () => {
    const [message] = run({ id: 2, method: 'global', sequences: ['ACGT', 'AGT'] });
    expect(message.type).toBe('result');
    if (message.type === 'result') expect(message.result.kind).toBe('pairwise');
  });

  it('signale un alignement trop grand sans le calculer', () => {
    const [message] = run({ id: 3, method: 'global', sequences: ['A'.repeat(6000), 'A'.repeat(6000)] });
    expect(message).toMatchObject({ type: 'error', tooLarge: true });
  });

  it('refuse un mauvais nombre de séquences', () => {
    const [message] = run({ id: 4, method: 'triple', sequences: ['ACGT', 'AGT'] });
    expect(message).toMatchObject({ type: 'error', tooLarge: false });
  });
});
