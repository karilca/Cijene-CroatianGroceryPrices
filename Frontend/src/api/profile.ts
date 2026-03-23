import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';

export interface UserProfile {
  id: number;
  supabase_uid: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

interface UserProfileResponse {
  id: number;
  supabase_uid: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

interface UserProfileUpdateResponse {
  message: string;
  profile: UserProfile;
}

const getAccessToken = async (supabase: SupabaseClient): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Korisnik nije prijavljen.');
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
    throw new Error('Greška pri dohvaćanju profila.');
  }

  const payload = await response.json() as UserProfileResponse;
  return {
    id: payload.id,
    supabase_uid: payload.supabase_uid,
    name: payload.name,
    email: payload.email,
    role_id: payload.role_id,
    role_name: payload.role_name,
    is_active: payload.is_active,
  };
};

export const updateUserProfileName = async (
  supabase: SupabaseClient,
  name: string,
): Promise<UserProfile> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/user/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    let detailMessage = 'Greška pri spremanju imena.';
    try {
      const payload = await response.json() as { detail?: string };
      if (payload?.detail) {
        detailMessage = payload.detail;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(detailMessage);
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
    let detailMessage = 'Greška pri deaktivaciji računa.';
    try {
      const payload = await response.json() as { detail?: string };
      if (payload?.detail) {
        detailMessage = payload.detail;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(detailMessage);
  }
}
