import { request } from '@umijs/max';

export async function getFrontendSettings(options?: Record<string, unknown>) {
  return request<API.FrontendSettings>('/api/settings/frontend', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function getGeneralSettings(options?: Record<string, unknown>) {
  return request<API.GeneralSettings>('/api/settings/general', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function updateGeneralSettings(data: API.GeneralSettings) {
  return request<API.GeneralSettings>('/api/settings/general', {
    method: 'PUT',
    data,
  });
}

// ── Public setup wizard endpoints (no JWT required) ───────────────

export async function getSetupStatus(
  options?: Record<string, unknown>,
): Promise<API.SetupStatus> {
  return request<API.SetupStatus>('/api/settings/setup', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function completeSetup(
  data: API.CompleteSetupParams,
): Promise<API.CompleteSetupResult> {
  return request<API.CompleteSetupResult>('/api/settings/setup', {
    method: 'POST',
    data,
  });
}
