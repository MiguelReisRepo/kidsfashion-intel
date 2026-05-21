import { describe, expect, it } from 'vitest';
import { teamSlug, teamAliases } from './team-slug.js';

describe('teamSlug', () => {
  it('maps explicit names to canonical slug', () => {
    expect(teamSlug('FC Barcelona')).toBe('barcelona');
    expect(teamSlug('Sporting CP')).toBe('sporting');
    expect(teamSlug('Sporting Lisbon')).toBe('sporting');
    expect(teamSlug('Real Madrid')).toBe('real-madrid');
    expect(teamSlug('Atlético Madrid')).toBe('atletico-madrid');
    expect(teamSlug('Seleção Nacional')).toBe('portugal');
    expect(teamSlug('Golden State Warriors')).toBe('warriors');
    expect(teamSlug('GSW')).toBe('warriors');
    expect(teamSlug('PSG')).toBe('psg');
  });

  it('strips diacritics and is case-insensitive', () => {
    expect(teamSlug('PORTO')).toBe('porto');
    expect(teamSlug('porto')).toBe('porto');
    expect(teamSlug('Itália')).toBe('italy');
  });

  it('falls back to kebab-case for unknown teams', () => {
    expect(teamSlug('Unknown Team XYZ')).toBe('unknown-team-xyz');
  });
});

describe('teamAliases', () => {
  it('returns the canonical alias plus all known aliases for the slug', () => {
    const aliases = teamAliases('FC Barcelona', 'barcelona');
    expect(aliases).toContain('fc barcelona');
    expect(aliases).toContain('barcelona');
  });

  it('returns Sporting variants', () => {
    const aliases = teamAliases('Sporting CP', 'sporting');
    expect(aliases).toContain('sporting cp');
    expect(aliases).toContain('sporting');
    expect(aliases).toContain('sporting lisbon');
  });
});
