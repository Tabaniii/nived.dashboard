import { describe, it, expect } from 'vitest';
import {
  sanitizeStaffCode,
  sanitizeTableCode,
  parseAttribution,
  buildAttributedUrl,
} from '@/lib/attribution';

describe('sanitizeStaffCode', () => {
  it('lowercases and slugifies staff names', () => {
    expect(sanitizeStaffCode('Andi')).toBe('andi');
    expect(sanitizeStaffCode('  Budi Santoso ')).toBe('budi-santoso');
    expect(sanitizeStaffCode('Siti_01')).toBe('siti_01');
    expect(sanitizeStaffCode('José')).toBe('jose');
  });

  it('strips markup and unsafe characters', () => {
    expect(sanitizeStaffCode('<script>alert(1)</script>')).toBe('scriptalert1script');
    expect(sanitizeStaffCode('andi"; drop table')).toBe('andi-drop-table');
  });

  it('returns null for empty or non-string input', () => {
    expect(sanitizeStaffCode('')).toBeNull();
    expect(sanitizeStaffCode('---')).toBeNull();
    expect(sanitizeStaffCode(null)).toBeNull();
    expect(sanitizeStaffCode(42)).toBeNull();
  });

  it('caps the code at 40 characters', () => {
    expect(sanitizeStaffCode('a'.repeat(60))).toHaveLength(40);
  });
});

describe('sanitizeTableCode', () => {
  it('uppercases table codes and keeps digits', () => {
    expect(sanitizeTableCode('12')).toBe('12');
    expect(sanitizeTableCode('a12')).toBe('A12');
    expect(sanitizeTableCode('VIP 1')).toBe('VIP-1');
  });

  it('returns null for empty input and caps length at 20', () => {
    expect(sanitizeTableCode('   ')).toBeNull();
    expect(sanitizeTableCode(undefined)).toBeNull();
    expect(sanitizeTableCode('9'.repeat(30))).toHaveLength(20);
  });
});

describe('parseAttribution', () => {
  it('reads staff and meja from URLSearchParams', () => {
    expect(parseAttribution(new URLSearchParams('staff=Andi&meja=12'))).toEqual({
      staffCode: 'andi',
      tableCode: '12',
    });
  });

  it('accepts the table alias and array values from Next.js searchParams', () => {
    expect(parseAttribution({ staff: ['Andi', 'Budi'], table: 'b3' })).toEqual({
      staffCode: 'andi',
      tableCode: 'B3',
    });
  });

  it('returns nulls when nothing is provided', () => {
    expect(parseAttribution(undefined)).toEqual({ staffCode: null, tableCode: null });
    expect(parseAttribution({})).toEqual({ staffCode: null, tableCode: null });
  });
});

describe('buildAttributedUrl', () => {
  it('appends sanitized staff and meja params', () => {
    expect(
      buildAttributedUrl('https://nived.studio/r/kopi-senja', { staff: 'Andi', table: '12' })
    ).toBe('https://nived.studio/r/kopi-senja?staff=andi&meja=12');
  });

  it('returns the base URL untouched when no attribution is given', () => {
    expect(buildAttributedUrl('https://nived.studio/r/kopi-senja', {})).toBe(
      'https://nived.studio/r/kopi-senja'
    );
  });
});
