import api from './api';

export interface Trip {
  id: number;
  name: string;
  description: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  members_count?: number;
  places_count?: number;
}

export interface CreateTripData {
  name: string;
  description?: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
}

// Получить все путешествия
export const getUserTrips = async (): Promise<Trip[]> => {
  try {
    const response = await api.get('/trips');
    return response.data.trips;
  } catch (error) {
    console.error('Get trips error:', error);
    throw error;
  }
};

// Получить одно путешествие
export const getTripById = async (id: number): Promise<any> => {
  try {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get trip error:', error);
    throw error;
  }
};

// Создать новое путешествие
export const createTrip = async (data: CreateTripData): Promise<Trip> => {
  try {
    const response = await api.post('/trips', data);
    return response.data.trip;
  } catch (error) {
    console.error('Create trip error:', error);
    throw error;
  }
};

// Обновить путешествие
export const updateTrip = async (id: number, data: Partial<CreateTripData>): Promise<void> => {
  try {
    await api.put(`/trips/${id}`, data);
  } catch (error) {
    console.error('Update trip error:', error);
    throw error;
  }
};

// Удалить путешествие
export const deleteTrip = async (id: number): Promise<void> => {
  try {
    await api.delete(`/trips/${id}`);
  } catch (error) {
    console.error('Delete trip error:', error);
    throw error;
  }
};

// Пригласить участника
export const inviteMember = async (tripId: number, email: string): Promise<void> => {
  try {
    await api.post(`/trips/${tripId}/invite`, { email });
  } catch (error) {
    console.error('Invite member error:', error);
    throw error;
  }
};