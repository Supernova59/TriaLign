import { describe, expect, it } from 'vitest';
import { RemoteFetchError, createThrottle, errorForStatus, readTextLimited } from '../../src/data/remote';

describe('createThrottle', () => {
  it('espace les requêtes, même lancées en même temps', async () => {
    // Les trois appels partent au même instant (l'horloge ne bouge pas pendant qu'on les lance).
    const sleeps: number[] = [];
    const throttle = createThrottle(350, { now: () => 1000, sleep: async (ms) => void sleeps.push(ms) });
    await Promise.all([throttle(), throttle(), throttle()]);
    // la première part tout de suite, les deux suivantes attendent 350 ms et 700 ms
    expect(sleeps).toEqual([350, 700]);
  });

  it('n\'attend pas si assez de temps s\'est écoulé', async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const throttle = createThrottle(350, { now: () => clock, sleep: async (ms) => void sleeps.push(ms) });
    await throttle();
    clock = 1000;
    await throttle();
    expect(sleeps).toEqual([]);
  });
});

describe('readTextLimited', () => {
  it('lit une réponse normale', async () => {
    expect(await readTextLimited(new Response('>x\nACGT'), 1000)).toBe('>x\nACGT');
  });

  it('refuse une réponse trop grande, même sans Content-Length', async () => {
    await expect(readTextLimited(new Response('A'.repeat(5000)), 1000)).rejects.toMatchObject({ kind: 'too-large' });
  });

  it('refuse d\'après Content-Length sans lire le contenu', async () => {
    const response = new Response('ACGT', { headers: { 'content-length': '999999999' } });
    await expect(readTextLimited(response, 1000)).rejects.toBeInstanceOf(RemoteFetchError);
  });
});

describe('errorForStatus', () => {
  it('distingue limite de requêtes, introuvable et erreur serveur', () => {
    expect(errorForStatus(429, 'X', 'NCBI').kind).toBe('rate-limit');
    expect(errorForStatus(404, 'X', 'NCBI').kind).toBe('not-found');
    expect(errorForStatus(400, 'X', 'NCBI').kind).toBe('not-found');
    expect(errorForStatus(503, 'X', 'NCBI').kind).toBe('server');
  });
});
