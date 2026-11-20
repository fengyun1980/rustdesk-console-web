export type PageState =
  | 'loading'
  | 'settingsRequired'
  | 'loadFailed'
  | 'ready';

export const CONN_TYPE_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
];

export const ARCH_OPTIONS = [
  { value: 'x86_64', label: 'x86_64' },
  { value: 'aarch64', label: 'aarch64' },
  { value: 'x86', label: 'x86 (sciter)' },
];

export const SERVER_FIELDS = [
  {
    key: 'custom-rendezvous-server',
    labelKey: 'pages.customClient.rendezvousServer',
  },
  { key: 'relay-server', labelKey: 'pages.customClient.relayServer' },
  { key: 'key', labelKey: 'pages.customClient.key' },
  { key: 'api-server', labelKey: 'pages.customClient.apiServer' },
] as const;
