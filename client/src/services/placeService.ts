import api from './api';

export interface Place {
  id: number;
  trip_id: number;
  name: string;
  description: string | null;
  category: 'attraction' | 'restaurant' | 'hotel' | 'transport' | 'other';
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visit_date?: string | null;      // 👈 новое
  visit_time?: string | null;      // 👈 новое
  visit_order?: number;            // 👈 новое
  cost: number;
  status: 'suggested' | 'approved' | 'rejected' | 'visited';
  suggested_by: number;
  suggested_by_name?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote: 'up' | 'down' | null;
}

export interface CreatePlaceData {
  name: string;
  description?: string;
  category?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  visit_date?: string | null;      // 👈 новое
  visit_time?: string | null;      // 👈 новое
  visit_order?: number;            // 👈 новое
  cost?: number;
}

// 👇 НОВЫЙ ИНТЕРФЕЙС для обновления таймлайна
export interface UpdateTimelineData {
  visit_date?: string | null;
  visit_time?: string | null;
  visit_order?: number;
}

// Получить все места путешествия
export const getPlaces = async (tripId: number): Promise<Place[]> => {
  try {
    const response = await api.get(`/trips/${tripId}/places`);
    return response.data.places;
  } catch (error) {
    console.error('Get places error:', error);
    throw error;
  }
};

// Добавить новое место
export const createPlace = async (tripId: number, data: CreatePlaceData): Promise<Place> => {
  try {
    const response = await api.post(`/trips/${tripId}/places`, data);
    return response.data.place;
  } catch (error) {
    console.error('Create place error:', error);
    throw error;
  }
};

// Обновить место
export const updatePlace = async (tripId: number, placeId: number, data: Partial<CreatePlaceData>): Promise<void> => {
  try {
    await api.put(`/trips/${tripId}/places/${placeId}`, data);
  } catch (error) {
    console.error('Update place error:', error);
    throw error;
  }
};
// Обновить таймлайн места
export const updatePlaceTimeline = async (
  tripId: number, 
  placeId: number, 
  data: UpdateTimelineData
): Promise<void> => {
  try {
    await api.put(`/trips/${tripId}/places/${placeId}/timeline`, data);
  } catch (error) {
    console.error('Update timeline error:', error);
    throw error;
  }
};
// Удалить место
export const deletePlace = async (tripId: number, placeId: number): Promise<void> => {
  try {
    await api.delete(`/trips/${tripId}/places/${placeId}`);
  } catch (error) {
    console.error('Delete place error:', error);
    throw error;
  }
};

// Голосовать за место
export const votePlace = async (tripId: number, placeId: number, vote: 'up' | 'down'): Promise<any> => {
  try {
    const response = await api.post(`/trips/${tripId}/places/${placeId}/vote`, { vote });
    return response.data;
  } catch (error) {
    console.error('Vote place error:', error);
    throw error;
  }
};