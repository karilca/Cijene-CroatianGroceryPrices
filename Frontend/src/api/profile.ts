import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';
import { createLocalizedApiErrorFromPayload, LocalizedApiError } from '../utils/apiErrors';

export interface UserProfile {
  id: number;
  supabase_uid: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  connection_id?: string;
  is_active: boolean;
}

interface UserProfileResponse {
  id: number;
  supabase_uid: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  connection_id?: string;
  is_active: boolean;
}

interface UserProfileUpdateResponse {
  message: string;
  profile: UserProfile;
}

const getAccessToken = async (supabase: SupabaseClient): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new LocalizedApiError('AUTH_REQUIRED', 'Authentication is required.');
  }

  return session.access_token;
};

export const getUserProfile = async (supabase: SupabaseClient): Promise<UserProfile> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/user/profile'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to load profile data.');
  }

  const payload = await response.json() as UserProfileResponse;
  return {
    id: payload.id,
    supabase_uid: payload.supabase_uid,
    name: payload.name,
    email: payload.email,
    role_id: payload.role_id,
    role_name: payload.role_name,
    connection_id: payload.connection_id,
    is_active: payload.is_active,
  };
};

export const updateUserProfile = async (
  supabase: SupabaseClient,
  name: string,
  connection_id?: string,
): Promise<UserProfile> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/user/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name, connection_id }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to update profile name.');
  }

  const payload = await response.json() as UserProfileUpdateResponse;
  return payload.profile;
};

export const deleteOwnAccount = async (
  supabase: SupabaseClient,
  confirmEmail: string,
  reason?: string,
): Promise<void> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/user/profile/delete'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      confirm_email: confirmEmail,
      reason,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to deactivate account.');
  }
}
