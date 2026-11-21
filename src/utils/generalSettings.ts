export const DEFAULT_GENERAL_SETTINGS: API.GeneralSettings = {
  watermarkEnabled: true,
  defaultLanguage: 'zh-CN',
  jwtExpiryDays: 30,
  auditRetentionDays: 0,
  deviceCloneIsolation: false,
  site: {
    frontendUrl: '',
    backendUrl: '',
  },
  webauthn: {
    enabled: false,
    rpName: 'RustDesk Console',
  },
};

export const DEFAULT_FRONTEND_SETTINGS: API.FrontendSettings = {
  watermarkEnabled: true,
  defaultLanguage: 'zh-CN',
  webauthnEnabled: false,
};

export const toFrontendSettings = (
  settings: API.GeneralSettings,
): API.FrontendSettings => ({
  watermarkEnabled: settings.watermarkEnabled,
  defaultLanguage: settings.defaultLanguage,
  webauthnEnabled: settings.webauthn.enabled,
});

export const getUsernameWatermark = (
  settings: { watermarkEnabled: boolean },
  username?: string,
) =>
  settings.watermarkEnabled && username ? { content: username } : undefined;
