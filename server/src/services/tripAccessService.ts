import { db } from '../config/database';

export type TripRole = 'creator' | 'admin' | 'member';

export const getTripRole = async (tripId: string | string[] | number, userId: number): Promise<TripRole | null> => {
  if (Array.isArray(tripId)) {
    return null;
  }

  const [rows] = await db.execute(
    'SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?',
    [tripId, userId]
  );

  const members = rows as Array<{ role: TripRole }>;
  return members[0]?.role ?? null;
};

export const isTripMember = async (tripId: string | string[] | number, userId: number): Promise<boolean> =>
  (await getTripRole(tripId, userId)) !== null;

export const canManageTrip = (role: TripRole | null): boolean =>
  role === 'creator' || role === 'admin';
