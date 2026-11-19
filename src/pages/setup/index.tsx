import { CloudServerOutlined } from '@ant-design/icons';
import {
  FormattedMessage,
  Helmet,
  history,
  useIntl,
} from '@umijs/max';
import { Alert, Button, Card, Divider, Form, Input, message, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { completeSetup } from '@/services/rustdesk-console/settings';
import { removeToken } from '@/utils/auth';

type FormValues = {
  serverUrl: string;
  serverPublicKey?: string;
  currentAdminPassword?: string;
  newAdminPassword?: string;
  confirmNewAdminPassword?: string;
};

const Setup: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<API.CompleteSetupResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const payload: API.CompleteSetupParams = {
        serverUrl: values.serverUrl.trim(),
        ...(values.serverPublicKey
          ? { serverPublicKey: values.serverPublicKey.trim() }
          : {}),
      };
      if (values.currentAdminPassword && values.newAdminPassword) {
        payload.currentAdminPassword = values.currentAdminPassword;
        payload.newAdminPassword = values.newAdminPassword;
      }
      const res = await completeSetup(payload);
      setResult(res);
      message.success(
        intl.formatMessage({ id: 'pages.setup.success', defaultMessage: 'Setup completed successfully' }),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string }; status?: number } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        intl.formatMessage({ id: 'pages.setup.submitFailed', defaultMessage: 'Failed to save settings' });
      setError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoLogin = () => {
    removeToken();
    history.push('/user/login');
  };

  if (result) {
    return <SetupResultView result={result} onGoLogin={handleGoLogin} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'pages.setup.title',
            defaultMessage: 'Initial Setup — RustDesk Console',
          })}
        </title>
      </Helmet>
      <Card
        style={{ maxWidth: 520, width: 'calc(100% - 32px)' }}
        title={
          <Space size={8}>
            <CloudServerOutlined />
            <FormattedMessage id="pages.setup.title" defaultMessage="RustDesk Console — Initial Setup" />
          </Space>
        }
      >
        <Typography.Paragraph type="secondary">
          <FormattedMessage
            id="pages.setup.intro"
            defaultMessage="Enter your server address below. It will be used for the console front-end, web client (remote control), and custom-client builds."
          />
        </Typography.Paragraph>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ serverUrl: '' }}
        >
          <Form.Item
            label={intl.formatMessage({
              id: 'pages.setup.serverUrl.label',
              defaultMessage: 'Server address',
            })}
            name="serverUrl"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'pages.setup.serverUrl.required', defaultMessage: 'Please enter your server address' }) },
              {
                pattern: /^https?:\/\/[^\s?#]*$/,
                message: intl.formatMessage({ id: 'pages.setup.serverUrl.invalid', defaultMessage: 'Use http:// or https://, without path, query or spaces' }),
              },
            ]}
            extra={intl.formatMessage({
              id: 'pages.setup.serverUrl.help',
              defaultMessage: 'Example: https://console.example.com',
            })}
          >
            <Input
              placeholder="https://rdc.tmnas.top"
              autoComplete="off"
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({
              id: 'pages.setup.serverPublicKey.label',
              defaultMessage: 'Server public key (optional)',
            })}
            name="serverPublicKey"
            extra={intl.formatMessage({
              id: 'pages.setup.serverPublicKey.help',
              defaultMessage: 'Ed25519 public key from Server Pro hbbs (id_ed25519.pub). Paste it to auto-enable web client; you can do this later too.',
            })}
          >
            <Input.TextArea
              autoComplete="off"
              rows={2}
              disabled={submitting}
              placeholder="Base64-encoded 32-byte key"
            />
          </Form.Item>

          <Divider>
            <FormattedMessage
              id="pages.setup.passwordSection"
              defaultMessage="Admin password (optional)"
            />
          </Divider>
          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            <FormattedMessage
              id="pages.setup.passwordHelp"
              defaultMessage="Change the built-in admin password now. Leave blank to keep the existing one."
            />
          </Typography.Paragraph>

          <Form.Item
            label={intl.formatMessage({ id: 'pages.setup.currentPassword', defaultMessage: 'Current password' })}
            name="currentAdminPassword"
          >
            <Input.Password disabled={submitting} autoComplete="current-password" />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'pages.setup.newPassword', defaultMessage: 'New password' })}
            name="newAdminPassword"
            dependencies={['currentAdminPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('currentAdminPassword') && (!value || value.length < 6)) {
                    return Promise.reject(new Error(
                      intl.formatMessage({ id: 'pages.setup.newPassword.min', defaultMessage: 'At least 6 characters' }),
                    ));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password disabled={submitting} autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({ id: 'pages.setup.confirmPassword', defaultMessage: 'Confirm new password' })}
            name="confirmNewAdminPassword"
            dependencies={['newAdminPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const newPw = getFieldValue('newAdminPassword');
                  if (newPw && value !== newPw) {
                    return Promise.reject(new Error(
                      intl.formatMessage({ id: 'pages.setup.confirmPassword.mismatch', defaultMessage: 'Passwords do not match' }),
                    ));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password disabled={submitting} autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              size="large"
            >
              <FormattedMessage id="pages.setup.submit" defaultMessage="Save and continue" />
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────

const SetupResultView: React.FC<{
  result: API.CompleteSetupResult;
  onGoLogin: () => void;
}> = ({ result, onGoLogin }) => {
  const intl = useIntl();
  const { webClient } = result;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card
        style={{ maxWidth: 560, width: 'calc(100% - 32px)' }}
        title={
          <Space size={8}>
            <CloudServerOutlined />
            <FormattedMessage id="pages.setup.result.title" defaultMessage="Setup complete" />
          </Space>
        }
      >
        <Alert
          type="success"
          showIcon
          message={intl.formatMessage(
            { id: 'pages.setup.result.done', defaultMessage: 'Server address saved: {origin}' },
            { origin: result.origin },
          )}
          style={{ marginBottom: 16 }}
        />

        <Typography.Paragraph>
          <FormattedMessage id="pages.setup.result.webClient" defaultMessage="Web client (remote control):" />
          <Typography.Text strong style={{ marginLeft: 8 }}>
            {webClient.enabled
              ? intl.formatMessage({ id: 'pages.setup.result.enabled', defaultMessage: 'Enabled' })
              : webClient.eligible
                ? intl.formatMessage({ id: 'pages.setup.result.disabled', defaultMessage: 'Address set, needs public key' })
                : intl.formatMessage({ id: 'pages.setup.result.skipped', defaultMessage: 'Skipped (HTTPS required)' })}
          </Typography.Text>
        </Typography.Paragraph>

        {webClient.idServerUrl && (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
            <FormattedMessage id="pages.setup.result.idServer" defaultMessage="ID server:" />{' '}
            <code>{webClient.idServerUrl}</code>
          </Typography.Paragraph>
        )}
        {webClient.relayServerUrl && (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
            <FormattedMessage id="pages.setup.result.relayServer" defaultMessage="Relay server:" />{' '}
            <code>{webClient.relayServerUrl}</code>
          </Typography.Paragraph>
        )}
        {webClient.allowedOrigin && (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            <FormattedMessage id="pages.setup.result.allowedOrigin" defaultMessage="Allowed origin:" />{' '}
            <code>{webClient.allowedOrigin}</code>
          </Typography.Paragraph>
        )}

        {result.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={intl.formatMessage({ id: 'pages.setup.result.warnings', defaultMessage: 'Please note' })}
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                {result.warnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            }
          />
        )}

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message={intl.formatMessage({ id: 'pages.setup.result.nextTitle', defaultMessage: 'Next steps' })}
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>
                <FormattedMessage
                  id="pages.setup.result.next.hbbsRelay"
                  defaultMessage="Make sure hbbs relay-servers in your Server Pro config match this address."
                />
              </li>
              <li>
                <FormattedMessage
                  id="pages.setup.result.next.webClientKey"
                  defaultMessage="If web client is still disabled, paste Server Pro hbbs id_ed25519.pub into Settings → Web Client."
                />
              </li>
              <li>
                <FormattedMessage
                  id="pages.setup.result.next.publicDomain"
                  defaultMessage="Access the console through the public domain (not localhost)."
                />
              </li>
            </ul>
          }
        />

        <Button type="primary" size="large" block onClick={onGoLogin}>
          <FormattedMessage id="pages.setup.result.goLogin" defaultMessage="Go to login" />
        </Button>
      </Card>
    </div>
  );
};

export default Setup;
