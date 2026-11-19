import {
  CloudServerOutlined,
  LeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  FormattedMessage,
  Helmet,
  history,
  useIntl,
} from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { completeSetup } from '@/services/rustdesk-console/settings';
import { removeToken } from '@/utils/auth';

type FormValues = {
  serverUrl: string;
  adminUsername: string;
  adminPassword: string;
  confirmAdminPassword: string;
};

type Step = 'form' | 'confirm' | 'result' | 'error';

const HBBS_MANAGEMENT_PORT = 21120;

/** Derive everything that will be auto-configured from the user's serverUrl */
function deriveConfigPreview(serverUrl: string) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(serverUrl);
  } catch {
    return null;
  }
  const isHttps = parsed.protocol === 'https:';
  const host = parsed.host; // includes non-default port

  return {
    origin: `${parsed.protocol}//${host}`,
    isHttps,
    general: { frontendUrl: `${parsed.protocol}//${host}` },
    serverManagement: {
      url: `http://${host}:${HBBS_MANAGEMENT_PORT}`,
      nodeId: 'rustdesk',
      nodeName: 'RustDesk',
      tokenNote: 'JWT_SECRET 环境变量',
    },
    webClient: {
      idServerUrl: `wss://${host}/ws/id`,
      relayServerUrl: `wss://${host}/ws/relay`,
      allowedOrigin: `${parsed.protocol}//${host}`,
      serverKeyNote: '自动从 hbbs /v1/status 获取',
    },
  };
}

const Setup: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [draftValues, setDraftValues] = useState<FormValues | null>(null);
  const [result, setResult] = useState<API.CompleteSetupResult | null>(null);
  const [error, setError] = useState<string>('');

  const goConfirm = async () => {
    try {
      const values = await form.validateFields();
      setDraftValues(values);
      setError('');
      setStep('confirm');
    } catch {
      // Form validation failed — antd already highlights fields
    }
  };

  const goBack = () => {
    setError('');
    setStep('form');
  };

  const confirmAndSubmit = async () => {
    if (!draftValues) return;
    setSubmitting(true);
    setError('');
    try {
      const payload: API.CompleteSetupParams = {
        serverUrl: draftValues.serverUrl.trim(),
        adminUsername: draftValues.adminUsername.trim(),
        adminPassword: draftValues.adminPassword,
      };
      const res = await completeSetup(payload);
      setResult(res);
      setStep('result');
      message.success(
        intl.formatMessage({
          id: 'pages.setup.success',
          defaultMessage: 'Setup completed successfully',
        }),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        intl.formatMessage({
          id: 'pages.setup.submitFailed',
          defaultMessage: 'Failed to save settings',
        });
      setError(msg);
      setStep('error');
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoLogin = () => {
    removeToken();
    history.push('/user/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: '24px 0',
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
        style={{ maxWidth: 620, width: 'calc(100% - 32px)' }}
        title={
          <Space size={8}>
            <CloudServerOutlined />
            <FormattedMessage
              id="pages.setup.title"
              defaultMessage="RustDesk Console — Initial Setup"
            />
          </Space>
        }
      >
        <Steps
          current={step === 'form' ? 0 : step === 'confirm' ? 1 : 2}
          items={[
            {
              title: intl.formatMessage({
                id: 'pages.setup.steps.fill',
                defaultMessage: '填写信息',
              }),
            },
            {
              title: intl.formatMessage({
                id: 'pages.setup.steps.review',
                defaultMessage: '确认无误',
              }),
            },
            {
              title: intl.formatMessage({
                id: 'pages.setup.steps.done',
                defaultMessage: '完成',
              }),
            },
          ]}
          style={{ marginBottom: 24 }}
        />

        {step === 'form' && (
          <FormView
            form={form as unknown as ReturnType<typeof Form.useForm>[0]}
            initialValues={draftValues}
            onNext={goConfirm}
            submitting={submitting}
          />
        )}

        {step === 'confirm' && draftValues && (
          <ConfirmView
            values={draftValues}
            onBack={goBack}
            onConfirm={confirmAndSubmit}
            submitting={submitting}
            error={error}
          />
        )}

        {step === 'error' && error && (
          <ErrorView error={error} onBack={goBack} submitting={submitting} />
        )}

        {step === 'result' && result && (
          <ResultView result={result} onGoLogin={handleGoLogin} />
        )}
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// Step 1: Form
// ────────────────────────────────────────────────────────────────────

const FormView: React.FC<{
  form: ReturnType<typeof Form.useForm>[0];
  initialValues: FormValues | null;
  onNext: () => void;
  submitting: boolean;
}> = ({ form, initialValues, onNext, submitting }) => {
  const intl = useIntl();

  return (
    <>
      <Typography.Paragraph type="secondary">
        <FormattedMessage
          id="pages.setup.intro"
          defaultMessage="Enter your server address and admin credentials below. The server address will be used for the console front-end, web client (remote control), custom-client builds, and the Server Management (hbbs) connection — all configured automatically."
        />
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues || { serverUrl: '' }}
      >
        <Form.Item
          label={intl.formatMessage({
            id: 'pages.setup.serverUrl.label',
            defaultMessage: 'Server address',
          })}
          name="serverUrl"
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.setup.serverUrl.required',
                defaultMessage: 'Please enter your server address',
              }),
            },
            {
              pattern: /^https?:\/\/[^\s?#]*$/,
              message: intl.formatMessage({
                id: 'pages.setup.serverUrl.invalid',
                defaultMessage: 'Use http:// or https://, without path, query or spaces',
              }),
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
            size="large"
          />
        </Form.Item>

        <Divider>
          <FormattedMessage
            id="pages.setup.adminSection"
            defaultMessage="Admin credentials"
          />
        </Divider>
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          <FormattedMessage
            id="pages.setup.adminHelp"
            defaultMessage="Set the administrator username and password for this installation."
          />
        </Typography.Paragraph>

        <Form.Item
          label={intl.formatMessage({
            id: 'pages.setup.adminUsername.label',
            defaultMessage: 'Admin username',
          })}
          name="adminUsername"
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.setup.adminUsername.required',
                defaultMessage: 'Please enter an admin username',
              }),
            },
            {
              min: 2,
              message: intl.formatMessage({
                id: 'pages.setup.adminUsername.min',
                defaultMessage: 'At least 2 characters',
              }),
            },
            {
              pattern: /^[A-Za-z0-9_.@-]+$/,
              message: intl.formatMessage({
                id: 'pages.setup.adminUsername.invalid',
                defaultMessage:
                  'Letters, numbers, dots, underscores, hyphens and @ only',
              }),
            },
          ]}
        >
          <Input
            autoComplete="username"
            disabled={submitting}
            placeholder="admin"
          />
        </Form.Item>

        <Form.Item
          label={intl.formatMessage({
            id: 'pages.setup.adminPassword.label',
            defaultMessage: 'Admin password',
          })}
          name="adminPassword"
          dependencies={['adminUsername']}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.setup.adminPassword.required',
                defaultMessage: 'Please enter a password',
              }),
            },
            {
              min: 6,
              message: intl.formatMessage({
                id: 'pages.setup.adminPassword.min',
                defaultMessage: 'At least 6 characters',
              }),
            },
          ]}
        >
          <Input.Password disabled={submitting} autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirmAdminPassword.label',
            defaultMessage: 'Confirm admin password',
          })}
          name="confirmAdminPassword"
          dependencies={['adminPassword']}
          rules={[
            {
              required: true,
              message: intl.formatMessage({
                id: 'pages.setup.confirmAdminPassword.required',
                defaultMessage: 'Please confirm your password',
              }),
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('adminPassword') !== value) {
                  return Promise.reject(
                    new Error(
                      intl.formatMessage({
                        id: 'pages.setup.confirmAdminPassword.mismatch',
                        defaultMessage: 'Passwords do not match',
                      }),
                    ),
                  );
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
            onClick={onNext}
            block
            size="large"
          >
            <FormattedMessage
              id="pages.setup.next"
              defaultMessage="下一步 · 预览确认"
            />
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────
// Step 2: Confirm — show the "confirmation sheet"
// ────────────────────────────────────────────────────────────────────

const ConfirmView: React.FC<{
  values: FormValues;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string;
}> = ({ values, onBack, onConfirm, submitting, error }) => {
  const intl = useIntl();
  const preview = useMemo(
    () => deriveConfigPreview(values.serverUrl.trim()),
    [values.serverUrl],
  );

  return (
    <>
      <Typography.Paragraph>
        <CheckCircleOutlined
          style={{ color: '#52c41a', marginRight: 6 }}
        />
        <FormattedMessage
          id="pages.setup.confirm.title"
          defaultMessage="请检查以下配置信息。确认无误后点击开始配置，系统将自动写入所有设置项。"
        />
      </Typography.Paragraph>

      {/* ── 用户填写 ── */}
      <Divider orientation={"left" as any} plain>
        <FormattedMessage
          id="pages.setup.confirm.section.user"
          defaultMessage="① 您填写的信息"
        />
      </Divider>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirm.serverUrl',
            defaultMessage: 'Server address',
          })}
        >
          <Typography.Text code>{values.serverUrl.trim()}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirm.adminUsername',
            defaultMessage: 'Admin username',
          })}
        >
          <Typography.Text code>{values.adminUsername.trim()}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirm.adminPassword',
            defaultMessage: 'Admin password',
          })}
        >
          <Typography.Text code>•••••••</Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      {/* ── 自动派生 ── */}
      <Divider orientation={"left" as any} plain>
        <FormattedMessage
          id="pages.setup.confirm.section.auto"
          defaultMessage="② 系统自动配置"
        />
        <Tag color="blue" style={{ marginLeft: 8 }}>
          <InfoCircleOutlined />{' '}
          <FormattedMessage
            id="pages.setup.confirm.auto.note"
            defaultMessage="无需手动填写"
          />
        </Tag>
      </Divider>

      {preview ? (
        <>
          {/* 常规设置 */}
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            <FormattedMessage
              id="pages.setup.confirm.auto.general"
              defaultMessage="常规设置"
            />
          </Typography.Text>
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.frontendUrl',
                defaultMessage: 'Site URL',
              })}
            >
              <Typography.Text code>{preview.general.frontendUrl}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {/* 服务器管理 */}
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            <FormattedMessage
              id="pages.setup.confirm.auto.serverMgmt"
              defaultMessage="服务器管理 (hbbs)"
            />
          </Typography.Text>
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.mgmtUrl',
                defaultMessage: '管理 API URL',
              })}
            >
              <Typography.Text code>{preview.serverManagement.url}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.mgmtToken',
                defaultMessage: '认证 Token',
              })}
            >
              <Typography.Text code>{preview.serverManagement.tokenNote}</Typography.Text>
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                <FormattedMessage
                  id="pages.setup.confirm.mgmtToken.hint"
                  defaultMessage="(console 与 hbbs 共用同一份 JWT_SECRET)"
                />
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.nodeId',
                defaultMessage: 'Node ID / Name',
              })}
            >
              <Typography.Text code>
                {preview.serverManagement.nodeId} / {preview.serverManagement.nodeName}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {/* 网页远控 */}
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            <FormattedMessage
              id="pages.setup.confirm.auto.webClient"
              defaultMessage="网页远控 (Web Client)"
            />
            {!preview.isHttps && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                <ExclamationCircleOutlined />{' '}
                <FormattedMessage
                  id="pages.setup.confirm.httpWarn"
                  defaultMessage="HTTP 环境 · 网页远控暂不启用"
                />
              </Tag>
            )}
          </Typography.Text>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.idServer',
                defaultMessage: 'ID server',
              })}
            >
              <Typography.Text code>{preview.webClient.idServerUrl}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.relayServer',
                defaultMessage: 'Relay server',
              })}
            >
              <Typography.Text code>{preview.webClient.relayServerUrl}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.allowedOrigin',
                defaultMessage: 'Allowed origin',
              })}
            >
              <Typography.Text code>{preview.webClient.allowedOrigin}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.serverKey',
                defaultMessage: 'Ed25519 public key',
              })}
            >
              <Typography.Text code>
                {preview.webClient.serverKeyNote}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                (GET {preview.serverManagement.url}/v1/status)
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'pages.setup.confirm.webEnabled',
                defaultMessage: 'Web Client 最终状态',
              })}
            >
              {preview.isHttps ? (
                <Tag color="blue">
                  <LoadingOutlined />{' '}
                  <FormattedMessage
                    id="pages.setup.confirm.webEnabled.willTry"
                    defaultMessage="有 key → Enabled · 无 key → Disabled"
                  />
                </Tag>
              ) : (
                <Tag color="orange">Disabled · HTTPS required</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <Alert
          type="error"
          showIcon
          message={intl.formatMessage({
            id: 'pages.setup.confirm.invalidUrl',
            defaultMessage: 'Server address 格式有误，请返回修改',
          })}
        />
      )}

      {/* ── 错误提示 ── */}
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginTop: 16 }}
        />
      )}

      {/* ── 操作按钮 ── */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          gap: 12,
        }}
      >
        <Button icon={<LeftOutlined />} onClick={onBack} size="large">
          <FormattedMessage
            id="pages.setup.back"
            defaultMessage="返回修改"
          />
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={onConfirm}
          loading={submitting}
          size="large"
          style={{ flex: 1 }}
          disabled={!preview}
        >
          <FormattedMessage
            id="pages.setup.confirm.submit"
            defaultMessage="确认无误 · 开始配置"
          />
        </Button>
      </div>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────
// Error step
// ────────────────────────────────────────────────────────────────────

const ErrorView: React.FC<{
  error: string;
  onBack: () => void;
  submitting: boolean;
}> = ({ error, onBack }) => {
  const intl = useIntl();
  return (
    <>
      <Alert
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message={intl.formatMessage({
          id: 'pages.setup.error.title',
          defaultMessage: '配置失败',
        })}
        description={error}
        style={{ marginBottom: 16 }}
      />
      <Button icon={<LeftOutlined />} onClick={onBack} size="large" block>
        <FormattedMessage
          id="pages.setup.back"
          defaultMessage="返回修改"
        />
      </Button>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────
// Step 3: Result
// ────────────────────────────────────────────────────────────────────

const ResultView: React.FC<{
  result: API.CompleteSetupResult;
  onGoLogin: () => void;
}> = ({ result, onGoLogin }) => {
  const intl = useIntl();
  const { webClient, serverManagement } = result;

  return (
    <>
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        message={intl.formatMessage({
          id: 'pages.setup.result.done',
          defaultMessage: '✅ 配置完成！',
        })}
        description={intl.formatMessage(
          {
            id: 'pages.setup.result.saved',
            defaultMessage:
              'Server: {origin} · Admin credentials configured · Server Management (hbbs) auto-connected',
          },
          { origin: result.origin },
        )}
        style={{ marginBottom: 16 }}
      />

      {/* 服务器管理 */}
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        <FormattedMessage
          id="pages.setup.result.section.sm"
          defaultMessage="服务器管理 (hbbs)"
        />
        {serverManagement.tokenConfigured ? (
          <Tag color="green" style={{ marginLeft: 8 }}>
            <CheckCircleOutlined /> Configured
          </Tag>
        ) : (
          <Tag color="red" style={{ marginLeft: 8 }}>
            Failed
          </Tag>
        )}
        {serverManagement.usingDefaultSecret && (
          <Tag color="orange" style={{ marginLeft: 4 }}>
            默认 JWT_SECRET
          </Tag>
        )}
      </Typography.Text>
      <Descriptions
        column={1}
        size="small"
        bordered
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirm.mgmtUrl',
            defaultMessage: '管理 API URL',
          })}
        >
          <code>{serverManagement.url}</code>
        </Descriptions.Item>
        <Descriptions.Item
          label={intl.formatMessage({
            id: 'pages.setup.confirm.nodeId',
            defaultMessage: 'Node ID / Name',
          })}
        >
          <code>
            {serverManagement.nodeId} / {serverManagement.nodeName}
          </code>
        </Descriptions.Item>
      </Descriptions>

      {/* 网页远控 */}
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        <FormattedMessage
          id="pages.setup.result.section.wc"
          defaultMessage="网页远控 (Web Client)"
        />
        {webClient.enabled ? (
          <Tag color="green" style={{ marginLeft: 8 }}>
            <CheckCircleOutlined /> Enabled
          </Tag>
        ) : webClient.eligible ? (
          <Tag color="orange" style={{ marginLeft: 8 }}>
            Disabled · 需公钥
          </Tag>
        ) : (
          <Tag color="default" style={{ marginLeft: 8 }}>
            Skipped
          </Tag>
        )}
      </Typography.Text>
      {webClient.idServerUrl && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
          <FormattedMessage
            id="pages.setup.confirm.idServer"
            defaultMessage="ID server:"
          />{' '}
          <code>{webClient.idServerUrl}</code>
        </Typography.Paragraph>
      )}
      {webClient.relayServerUrl && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
          <FormattedMessage
            id="pages.setup.confirm.relayServer"
            defaultMessage="Relay server:"
          />{' '}
          <code>{webClient.relayServerUrl}</code>
        </Typography.Paragraph>
      )}
      {webClient.allowedOrigin && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          <FormattedMessage
            id="pages.setup.confirm.allowedOrigin"
            defaultMessage="Allowed origin:"
          />{' '}
          <code>{webClient.allowedOrigin}</code>
        </Typography.Paragraph>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
          message={intl.formatMessage({
            id: 'pages.setup.result.warnings',
            defaultMessage: '请注意',
          })}
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              {result.warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          }
        />
      )}

      <Button
        type="primary"
        size="large"
        block
        icon={<CheckCircleOutlined />}
        onClick={onGoLogin}
      >
        <FormattedMessage
          id="pages.setup.result.goLogin"
          defaultMessage="进入系统 · 去登录"
        />
      </Button>
    </>
  );
};

export default Setup;
