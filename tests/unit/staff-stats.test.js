import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from '@/lib/staff-stats';

const taps = [
  { staff_code: 'andi', table_code: '12', selected_stars: 5 },
  { staff_code: 'andi', table_code: '12', selected_stars: 4 },
  { staff_code: 'andi', table_code: '7', selected_stars: null },
  { staff_code: 'budi', table_code: '7', selected_stars: 5 },
  { staff_code: 'budi', table_code: '7', selected_stars: 2 },
  { staff_code: null, table_code: null, selected_stars: 5 },
];

const feedbacks = [
  { staff_code: 'budi', table_code: '7', rating: 2 },
  { staff_code: 'andi', table_code: '12', rating: 5 },
  { staff_code: 'cici', table_code: null, rating: 1 },
];

describe('buildLeaderboard', () => {
  it('ranks staff by positive (4–5★) ratings and computes per-staff stats', () => {
    const board = buildLeaderboard({ taps, feedbacks });

    expect(board.map((row) => row.code)).toEqual(['andi', 'budi', 'cici']);
    expect(board[0]).toEqual({
      code: 'andi',
      taps: 3,
      ratedTaps: 2,
      avgStars: 4.5,
      positive: 2,
      negative: 0,
      positiveRate: 1,
      feedbackCount: 1,
      complaintCount: 0,
    });
    expect(board[1]).toMatchObject({
      code: 'budi',
      taps: 2,
      avgStars: 3.5,
      positive: 1,
      negative: 1,
      positiveRate: 0.5,
      complaintCount: 1,
    });
  });

  it('includes staff that only appear in written feedback', () => {
    const cici = buildLeaderboard({ taps, feedbacks }).find((row) => row.code === 'cici');
    expect(cici).toEqual({
      code: 'cici',
      taps: 0,
      ratedTaps: 0,
      avgStars: null,
      positive: 0,
      negative: 0,
      positiveRate: null,
      feedbackCount: 1,
      complaintCount: 1,
    });
  });

  it('can group by table instead of staff', () => {
    const board = buildLeaderboard({ taps, feedbacks, key: 'table_code' });
    expect(board.map((row) => row.code)).toEqual(['12', '7']);
    expect(board.find((row) => row.code === '7')).toMatchObject({ taps: 3, complaintCount: 1 });
  });

  it('returns an empty board when there is no attributed activity', () => {
    expect(buildLeaderboard({ taps: [{ staff_code: null, selected_stars: 5 }] })).toEqual([]);
    expect(buildLeaderboard()).toEqual([]);
  });
});
