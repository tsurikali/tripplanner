import api from './api';

export interface Invitation {
    id: number;
    trip_id: number;
    trip_name: string;
    destination: string;
    inviter_name: string;
    email: string;
    role: string;
    token: string;
    expires_at: string;
}

// Отправить приглашение
export const sendInvitation = async (tripId: number, email: string, role?: string): Promise<{ inviteLink: string }> => {
    try {
        const response = await api.post(`/trips/${tripId}/invite`, { email, role });
        return response.data;
    } catch (error) {
        console.error('Send invitation error:', error);
        throw error;
    }
};

// Получить информацию о приглашении
export const getInvitation = async (token: string): Promise<Invitation> => {
    try {
        const response = await api.get(`/invitations/${token}`);
        return response.data.invitation;
    } catch (error) {
        console.error('Get invitation error:', error);
        throw error;
    }
};

// Принять приглашение
export const acceptInvitation = async (token: string): Promise<{ tripId: number }> => {
    try {
        const response = await api.post(`/invitations/${token}/accept`);
        return response.data;
    } catch (error) {
        console.error('Accept invitation error:', error);
        throw error;
    }
};

// Отклонить приглашение
export const declineInvitation = async (token: string): Promise<void> => {
    try {
        await api.post(`/invitations/${token}/decline`);
    } catch (error) {
        console.error('Decline invitation error:', error);
        throw error;
    }
};