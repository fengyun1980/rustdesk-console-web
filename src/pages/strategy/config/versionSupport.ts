/**
 * 各配置项首次出现在上游 RustDesk 源码中的版本。
 * 依据 rustdesk/rustdesk 各 release tag 的源码检索；未列出的项从 1.3.7 起即支持。
 * 'latest' 表示仅上游默认分支（构建时版本留空）支持。
 */
export const OPTION_MIN_VERSION: Record<string, string> = {
  'allow-d3d-render': '1.3.9',
  'allow-printer-auto-print': '1.3.9',
  'enable-camera': '1.3.9',
  'enable-remote-printer': '1.3.9',
  'printer-incomming-job-action': '1.3.9',
  'printer-selected-name': '1.3.9',
  'allow-auto-update': '1.4.0',
  'allow-websocket': '1.4.0',
  'hide-remote-printer-settings': '1.4.0',
  'hide-websocket-settings': '1.4.0',
  'trackpad-speed': '1.4.0',
  'allow-numeric-one-time-password': '1.4.1',
  'enable-ipv6-punch': '1.4.1',
  'enable-terminal': '1.4.1',
  'enable-udp-punch': '1.4.1',
  'hide-powered-by-me': '1.4.1',
  'terminal-persistent': '1.4.1',
  'disable-discovery-panel': '1.4.2',
  'main-window-always-on-top': '1.4.2',
  'show-virtual-joystick': '1.4.3',
  'show-virtual-mouse': '1.4.3',
  'allow-ask-for-note': '1.4.4',
  'allow-insecure-tls-fallback': '1.4.4',
  'disable-udp': '1.4.4',
  'edge-scroll-edge-thickness': '1.4.4',
  'enable-flutter-http-on-rust': '1.4.4',
  'disable-change-id': '1.4.5',
  'disable-change-permanent-password': '1.4.5',
  'disable-unlock-pin': '1.4.5',
  'file-transfer-max-files': '1.4.5',
  'avatar': '1.4.6',
  'keep-awake-during-incoming-sessions': '1.4.6',
  'keep-awake-during-outgoing-sessions': '1.4.6',
  'allow-deep-link-password': '1.4.7',
  'allow-deep-link-server-settings': '1.4.7',
  'enable-perm-change-in-accept-window': '1.4.7',
  'enable-privacy-mode': '1.4.7',
  'hide-stop-service': '1.4.7',
  'allow-command-line-settings-when-settings-disabled': '1.5.0',
  'allow-https-21114': '1.5.0',
  'allow-kcp-congestion-control': '1.5.0',
  'allow-logon-screen-password': '1.5.0',
  'allow-scope-violation-alarm': '1.5.0',
  'allow-scope-violation-close': '1.5.0',
  'allow-sync-clipboard-between-sessions': '1.5.0',
  'default-connect-password': '1.5.0',
  'display-name': '1.5.0',
  'enable-android-software-encoding-half-scale': '1.5.0',
  'enable-port-forward-mux': '1.5.0',
  'enable-tcp-punch': '1.5.0',
  'enable-webrtc': '1.5.0',
  'floating-window-size': '1.5.0',
  'floating-window-svg': '1.5.0',
  'floating-window-transparency': '1.5.0',
  'floating-window-untouchable': '1.5.0',
  'hide-elevate-button-in-accept-window': '1.5.0',
  'hide-general-settings': '1.5.0',
  'hide-recording-button': '1.5.0',
  'hide-tray': '1.5.0',
  'id-whitelist': '1.5.0',
  'one-way-clipboard-redirection': '1.5.0',
  'one-way-file-transfer': '1.5.0',
  'preset-address-book-alias': '1.5.0',
  'preset-address-book-name': '1.5.0',
  'preset-address-book-note': '1.5.0',
  'preset-address-book-password': '1.5.0',
  'preset-address-book-tag': '1.5.0',
  'preset-device-group-name': '1.5.0',
  'preset-device-name': '1.5.0',
  'preset-device-username': '1.5.0',
  'preset-note': '1.5.0',
  'preset-strategy-name': '1.5.0',
  'preset-user-name': '1.5.0',
  'relay-fallback-delay': '1.5.0',
  'sync-init-clipboard': '1.5.0',
  'use-raw-tcp-for-api': '1.5.0',
  'windows-service-video-save-directory': '1.5.0',
  'trusted-device-expiration-days': '1.5.1',
  'ice-servers': '1.5.3',
  'websocket-port': '1.5.3',
  'quit-button-text': 'latest',
};

function parseVersion(version: string): number[] {
  return version
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((n) => Number.isFinite(n));
}

function compareVersion(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 判断配置项是否适用于所选客户端版本。
 * version 为空表示构建上游默认分支（最新代码），此时全部可用。
 */
export function isOptionSupported(
  key: string,
  version?: string | null,
): boolean {
  const min = OPTION_MIN_VERSION[key];
  if (!min) return true;
  if (!version) return true;
  if (min === 'latest') return false;
  return compareVersion(version, min) >= 0;
}
