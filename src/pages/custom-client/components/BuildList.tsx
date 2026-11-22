import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  GithubOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type {
  ActionType,
  ColumnsState,
  ProColumns,
} from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import {
  App,
  Button,
  Grid,
  Popconfirm,
  Progress,
  Space,
  Tag,
  Typography,
} from 'antd';
import React from 'react';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';
import {
  cancelBuild,
  deleteBuild,
  getBuildList,
  getCustomClientSettings,
} from '@/services/rustdesk-console/custom-client';

const { Title } = Typography;

interface BuildListProps {
  actionRef: React.MutableRefObject<ActionType | null>;
  onCreate: () => void;
  onRetry: (record: API.CustomClientBuild) => void;
  onProgress: (uuid: string) => void;
}

const TERMINAL_STATUSES = [
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
  'neutral',
  'action_required',
];

const RETRYABLE_STATUSES = [
  'failed',
  'cancelled',
  'timed_out',
  'action_required',
];

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'processing', icon: <LoadingOutlined /> },
  building: { color: 'processing', icon: <LoadingOutlined /> },
  completed: { color: 'success', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', icon: <WarningOutlined /> },
  cancelled: { color: 'warning', icon: <WarningOutlined /> },
  skipped: { color: 'default', icon: <MinusCircleOutlined /> },
  timed_out: { color: 'error', icon: <ClockCircleOutlined /> },
  neutral: { color: 'default', icon: <MinusCircleOutlined /> },
  action_required: { color: 'warning', icon: <WarningOutlined /> },
};

const COLUMNS_STATE_KEY = 'custom_client_build_list_columns_state_v3';
const COLUMN_WIDTHS_KEY = 'custom_client_build_list_column_widths_v1';

const readColumnWidths = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  return {};
};

type ResizableTitleProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  width?: number;
  onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
};

const ResizableTitle: React.FC<ResizableTitleProps> = ({
  onResize,
  width,
  ...restProps
}) => {
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      draggableOpts={{ enableUserSelectHack: false }}
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const readColumnsState = (): Record<string, ColumnsState> => {
  try {
    const raw = localStorage.getItem(COLUMNS_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  // 默认隐藏 UUID 列，与历史界面保持一致；用户仍可在列设置里打开
  return { uuid: { show: false } };
};

const BuildList: React.FC<BuildListProps> = ({
  actionRef,
  onCreate,
  onRetry,
  onProgress,
}) => {
  const intl = useIntl();
  const { message: msgApi } = App.useApp();
  const screens = Grid.useBreakpoint();
  // 窄屏（手机）只保留一列堆叠展示，避免宽表格横向溢出
  const isMobile = screens.md === false;
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [generatorRepo, setGeneratorRepo] = React.useState<string>(
    'databk/rustdesk-generator',
  );
  const [columnsStateMap, setColumnsStateMap] =
    React.useState<Record<string, ColumnsState>>(readColumnsState);
  const [columnWidths, setColumnWidths] =
    React.useState<Record<string, number>>(readColumnWidths);

  const handleResize =
    (key: string) =>
    (_e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      setColumnWidths((prev) => {
        const next = { ...prev, [key]: Math.max(60, Math.round(size.width)) };
        try {
          localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota/permission errors
        }
        return next;
      });
    };

  React.useEffect(() => {
    getCustomClientSettings()
      .then((settings) => {
        if (settings?.generatorRepo) setGeneratorRepo(settings.generatorRepo);
      })
      .catch(() => undefined);
  }, []);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: intl.formatMessage({
        id: 'pages.customClient.statusPending',
        defaultMessage: 'Build Pending',
      }),
      building: intl.formatMessage({
        id: 'pages.customClient.statusBuilding',
        defaultMessage: 'Building',
      }),
      completed: intl.formatMessage({
        id: 'pages.customClient.statusCompleted',
        defaultMessage: 'Build Completed',
      }),
      failed: intl.formatMessage({
        id: 'pages.customClient.statusFailed',
        defaultMessage: 'Build Failed',
      }),
      cancelled: intl.formatMessage({
        id: 'pages.customClient.statusCancelled',
        defaultMessage: 'Build Cancelled',
      }),
      skipped: intl.formatMessage({
        id: 'pages.customClient.statusSkipped',
        defaultMessage: 'Build Skipped',
      }),
      timed_out: intl.formatMessage({
        id: 'pages.customClient.statusTimedOut',
        defaultMessage: 'Build Timed Out',
      }),
      neutral: intl.formatMessage({
        id: 'pages.customClient.statusNeutral',
        defaultMessage: 'Build Neutral',
      }),
      action_required: intl.formatMessage({
        id: 'pages.customClient.statusActionRequired',
        defaultMessage: 'Action Required',
      }),
    };
    return map[status] || status;
  };

  const managePolling = (records: API.CustomClientBuild[]) => {
    const hasPending = records.some(
      (r) => r.status === 'pending' || r.status === 'building',
    );
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => {
        actionRef.current?.reload();
      }, 5000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleDelete = async (uuid: string) => {
    try {
      await deleteBuild(uuid);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.customClient.deleteSuccess',
          defaultMessage: 'Build record deleted',
        }),
      );
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.customClient.deleteFailed',
          defaultMessage: 'Failed to delete build record',
        }),
      );
    }
  };

  const handleCancel = async (uuid: string) => {
    try {
      await cancelBuild(uuid);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.customClient.cancelBuildSuccess',
          defaultMessage: 'Build cancelled',
        }),
      );
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.customClient.cancelBuildFailed',
          defaultMessage: 'Failed to cancel build',
        }),
      );
    }
  };

  const githubActionUrl = (record: API.CustomClientBuild): string | null => {
    if (!record.githubRunId) return null;
    return `https://github.com/${generatorRepo}/actions/runs/${record.githubRunId}`;
  };

  const renderStatus = (
    record: API.CustomClientBuild,
    mobile = false,
  ): React.ReactNode => {
    const config = statusConfig[record.status] || {
      color: 'default',
      icon: null,
    };
    if (record.status === 'pending' || record.status === 'building') {
      const percent = record.progress?.percent ?? 0;
      const stepText =
        record.progress?.currentStep ||
        record.progress?.currentJob ||
        intl.formatMessage({
          id: 'pages.customClient.waitingGithub',
          defaultMessage: 'Waiting for GitHub…',
        });
      const totalSteps = record.progress?.totalSteps ?? 0;
      const completedSteps = record.progress?.completedSteps ?? 0;
      const statusTag = (
        <Tag color={config.color} icon={config.icon}>
          {statusLabel(record.status)}
        </Tag>
      );
      const stepCount = totalSteps > 0 && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--ant-color-primary, #1677ff)',
          }}
        >
          {intl.formatMessage(
            {
              id: 'pages.customClient.stepCount',
              defaultMessage: 'Step: {completed}/{total}',
            },
            { completed: completedSteps, total: totalSteps },
          )}
        </span>
      );
      return (
        <div
          style={{
            minWidth: mobile ? 0 : 160,
            width: mobile ? '100%' : undefined,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {mobile ? (
            // 窄屏：状态靠左、步骤靠右，进度条和步骤名各占一行。
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              {statusTag}
              {stepCount}
            </div>
          ) : (
            <Space size={12} align="center" wrap>
              {statusTag}
              {stepCount}
            </Space>
          )}
          <Progress
            percent={percent}
            size="small"
            status="active"
            style={{
              margin: '6px 0 2px',
              width: '100%',
              minWidth: 0,
            }}
          />
          <div
            title={stepText}
            style={{
              fontSize: 12,
              lineHeight: '16px',
              color: 'var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45))',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: mobile ? '100%' : 230,
            }}
          >
            {stepText}
          </div>
        </div>
      );
    }
    return (
      <Tag color={config.color} icon={config.icon}>
        {statusLabel(record.status)}
      </Tag>
    );
  };

  const renderActionItems = (
    record: API.CustomClientBuild,
  ): React.ReactNode[] => {
    const files: { name: string; url: string }[] = (() => {
      try {
        return record.files ? JSON.parse(record.files) : [];
      } catch {
        return [];
      }
    })();
    const isInProgress =
      record.status === 'pending' || record.status === 'building';
    const isTerminal = TERMINAL_STATUSES.includes(record.status);
    const isRetryable = RETRYABLE_STATUSES.includes(record.status);
    const actionUrl = githubActionUrl(record);
    const items: React.ReactNode[] = [];

    if (isInProgress) {
      items.push(
        <Popconfirm
          key="cancel"
          title={intl.formatMessage({
            id: 'pages.customClient.cancelBuildConfirm',
            defaultMessage: 'Are you sure you want to cancel this build?',
          })}
          onConfirm={() => handleCancel(record.uuid)}
          okText={intl.formatMessage({
            id: 'pages.common.confirm',
            defaultMessage: 'Yes',
          })}
          cancelText={intl.formatMessage({
            id: 'pages.common.cancel',
            defaultMessage: 'No',
          })}
        >
          <Button type="link" size="small" danger icon={<StopOutlined />}>
            <FormattedMessage
              id="pages.customClient.cancelBuild"
              defaultMessage="Cancel"
            />
          </Button>
        </Popconfirm>,
        <Button
          key="progress"
          type="link"
          size="small"
          onClick={() => onProgress(record.uuid)}
        >
          <FormattedMessage
            id="pages.customClient.viewProgress"
            defaultMessage="Progress"
          />
        </Button>,
      );
    }
    if (isRetryable) {
      items.push(
        <Button
          key="retry"
          type="link"
          size="small"
          icon={<RedoOutlined />}
          onClick={() => onRetry(record)}
        >
          <FormattedMessage
            id="pages.customClient.retryBuild"
            defaultMessage="Retry"
          />
        </Button>,
      );
    }
    if (actionUrl) {
      items.push(
        <Button
          key="github"
          type="link"
          size="small"
          icon={<GithubOutlined />}
          href={actionUrl}
          target="_blank"
        >
          <FormattedMessage
            id="pages.customClient.viewOnGithub"
            defaultMessage="GitHub"
          />
        </Button>,
      );
    }
    if (record.status === 'completed') {
      files.forEach((file) => {
        items.push(
          <a
            key={`file-${file.url}`}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            style={{ wordBreak: 'break-all' }}
          >
            {file.name}
          </a>,
        );
      });
    }
    if (isTerminal) {
      items.push(
        <Popconfirm
          key="delete"
          title={intl.formatMessage({
            id: 'pages.customClient.deleteBuildConfirm',
            defaultMessage:
              'Are you sure you want to delete this build record?',
          })}
          onConfirm={() => handleDelete(record.uuid)}
          okText={intl.formatMessage({
            id: 'pages.common.confirm',
            defaultMessage: 'Yes',
          })}
          cancelText={intl.formatMessage({
            id: 'pages.common.cancel',
            defaultMessage: 'No',
          })}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            <FormattedMessage
              id="pages.common.delete"
              defaultMessage="Delete"
            />
          </Button>
        </Popconfirm>,
      );
    }
    return items;
  };

  const columns: ProColumns<API.CustomClientBuild>[] = [
    {
      title: intl.formatMessage({
        id: 'pages.customClient.uuid',
        defaultMessage: 'UUID',
      }),
      dataIndex: 'uuid',
      key: 'uuid',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.os',
        defaultMessage: 'OS',
      }),
      dataIndex: 'os',
      key: 'os',
      width: 100,
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.arch',
        defaultMessage: 'Arch',
      }),
      dataIndex: 'arch',
      key: 'arch',
      width: 90,
      render: (_: React.ReactNode, record: API.CustomClientBuild) =>
        record.arch || '-',
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.appName',
        defaultMessage: 'Application Name',
      }),
      key: 'appName',
      width: 140,
      ellipsis: true,
      render: (_: React.ReactNode, record: API.CustomClientBuild) =>
        appNameOf(record),
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.rustdeskVersion',
        defaultMessage: 'RustDesk Version',
      }),
      dataIndex: 'rustdeskVersion',
      key: 'rustdeskVersion',
      width: 130,
      render: (_: React.ReactNode, record: API.CustomClientBuild) =>
        versionOf(record),
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.createdAt',
        defaultMessage: 'Created At',
      }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      ellipsis: true,
      render: (_: React.ReactNode, record: API.CustomClientBuild) =>
        record.createdAt ? new Date(record.createdAt).toLocaleString() : '-',
    },
    {
      title: intl.formatMessage({
        id: 'pages.customClient.status',
        defaultMessage: 'Status',
      }),
      dataIndex: 'status',
      key: 'status',
      width: 200,
      render: (_: React.ReactNode, record: API.CustomClientBuild) =>
        renderStatus(record),
    },
    {
      title: intl.formatMessage({
        id: 'pages.common.action',
        defaultMessage: 'Action',
      }),
      key: 'action',
      search: false,
      render: (_: any, record: API.CustomClientBuild) => (
        <Space size={0} separator={<span style={{ color: '#d9d9d9' }}>|</span>}>
          {renderActionItems(record)}
        </Space>
      ),
    },
  ];

  const appNameOf = (record: API.CustomClientBuild) => {
    try {
      const custom = record.custom ? JSON.parse(record.custom) : null;
      const appName = custom?.['app-name'];
      if (appName) return appName;
    } catch {
      // ignore malformed custom payload
    }
    return 'RustDesk';
  };

  const versionOf = (record: API.CustomClientBuild) => {
    if (record.rustdeskVersion) return record.rustdeskVersion;
    // 旧记录没有单独存版本，从产物文件名里兜底解析（如 rdservice-1.5.1-x86_64.exe）
    try {
      const files: { name: string }[] = record.files
        ? JSON.parse(record.files)
        : [];
      for (const file of files) {
        const matched = file.name.match(/\d+\.\d+\.\d+/);
        if (matched) return matched[0];
      }
    } catch {
      // ignore malformed files payload
    }
    return '-';
  };

  // 窄屏用单列卡片式布局：状态、进度和操作上下堆叠，不再横向撑出屏幕。
  const mobileColumns: ProColumns<API.CustomClientBuild>[] = [
    {
      title: intl.formatMessage({
        id: 'pages.customClient.status',
        defaultMessage: 'Status',
      }),
      key: 'mobileBuild',
      render: (_: React.ReactNode, record: API.CustomClientBuild) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65))',
            }}
          >
            {appNameOf(record)} · {record.os} / {record.arch || '-'} ·{' '}
            {versionOf(record)}
            {record.createdAt
              ? ` · ${new Date(record.createdAt).toLocaleString()}`
              : ''}
          </div>
          {renderStatus(record, true)}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            {renderActionItems(record)}
          </div>
        </div>
      ),
    },
  ];

  // 所有列默认给一个宽度，用户拖拽表头右边缘即可调整，宽度按列 key 持久化。
  const mergedColumns = (isMobile ? mobileColumns : columns).map((col) => {
    const key = String(col.key ?? col.dataIndex ?? '');
    const width =
      columnWidths[key] ??
      (typeof col.width === 'number'
        ? col.width
        : key === 'action'
          ? 360
          : undefined);
    return {
      ...col,
      width,
      onHeaderCell: (column: ProColumns<API.CustomClientBuild>) =>
        ({
          width: column.width,
          onResize: handleResize(key),
        }) as React.ThHTMLAttributes<HTMLTableCellElement>,
    } as ProColumns<API.CustomClientBuild>;
  });

  const totalWidth = mergedColumns.reduce(
    (sum, col) => sum + (typeof col.width === 'number' ? col.width : 0),
    0,
  );

  return (
    <ProTable<API.CustomClientBuild>
      headerTitle={
        <Title level={5} style={{ margin: 0 }}>
          <FormattedMessage
            id="pages.customClient.buildList"
            defaultMessage="Build History"
          />
        </Title>
      }
      columnsState={{
        value: columnsStateMap,
        onChange: (map) => {
          setColumnsStateMap(map);
          try {
            localStorage.setItem(COLUMNS_STATE_KEY, JSON.stringify(map));
          } catch {
            // ignore storage quota/permission errors
          }
        },
      }}
      actionRef={actionRef}
      rowKey="uuid"
      search={false}
      columns={mergedColumns}
      components={{ header: { cell: ResizableTitle } }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: !isMobile,
        showQuickJumper: !isMobile,
      }}
      scroll={isMobile ? undefined : { x: totalWidth }}
      options={{
        density: true,
        setting: isMobile ? false : { listsHeight: 400 },
        fullScreen: false,
        reload: true,
      }}
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
        >
          <FormattedMessage
            id="pages.customClient.createBuild"
            defaultMessage="Create New Client"
          />
        </Button>,
      ]}
      request={async () => {
        try {
          const records = await getBuildList();
          managePolling(records);
          return {
            data: records,
            success: true,
          };
        } catch {
          return {
            data: [],
            success: false,
          };
        }
      }}
    />
  );
};

export default BuildList;
