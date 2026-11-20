import { request } from '@umijs/max';

// Settings APIs (admin only)

export async function getCustomClientSettings() {
  return request<API.CustomClientSettings>('/api/custom-client/settings', {
    method: 'GET',
    skipErrorHandler: true,
  });
}

export async function updateCustomClientSettings(
  data: API.UpdateCustomClientSettingsParams,
) {
  return request<API.CustomClientSettings>('/api/custom-client/settings', {
    method: 'PUT',
    data,
    skipErrorHandler: true,
  });
}

// Build APIs

export async function getBuildList() {
  return request<API.BuildRecord[]>('/api/custom-client/builds', {
    method: 'GET',
    skipErrorHandler: true,
  });
}

export async function submitBuild(data: API.SubmitBuildParams) {
  return request<API.SubmitBuildResult>('/api/custom-client/builds', {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
}

export async function deleteBuild(uuid: string) {
  return request(`/api/custom-client/builds/${uuid}`, {
    method: 'DELETE',
    skipErrorHandler: true,
  });
}

export async function downloadBuildFile(uuid: string, filename: string) {
  return request<Blob>(
    `/api/custom-client/builds/${uuid}/files/${encodeURIComponent(filename)}`,
    {
      method: 'GET',
      responseType: 'blob',
      skipErrorHandler: true,
    },
  );
}
