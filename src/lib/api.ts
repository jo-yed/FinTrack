import { supabase } from './supabase';

export type ApiErrorCode =
  | 'invalid_name' | 'invalid_phone' | 'invalid_password' | 'weak_password' | 'phone_exists'
  | 'too_many_requests' | 'unauthorized' | 'forbidden' | 'mfa_required' | 'not_found'
  | 'cannot_target_self' | 'cannot_target_admin' | 'invalid_request' | 'forbidden_origin'
  | 'server_error' | 'network';

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
  }
}

/** Appelle la fonction serveur « fintrack-api » (inscription par téléphone, réinitialisations, suppression de compte). */
export async function callApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('fintrack-api', { body: { action, ...body } });

  if (error) {
    // Les erreurs HTTP de la fonction portent un corps JSON { error: 'code' }
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      try {
        const payload = (await response.clone().json()) as { error?: string };
        if (payload?.error) throw new ApiError(payload.error as ApiErrorCode);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    throw new ApiError('network');
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new ApiError((data as { error: string }).error as ApiErrorCode);
  }
  return data as T;
}

/** Traduit un code d'erreur technique en clé de texte affichable. */
export function apiErrorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.code : 'server_error';
  return `apiErrors.${code}`;
}
