import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Divider, Popconfirm, Space, Tooltip } from 'antd';
import React from 'react';
import MobileListCard from '@/components/MobileListCard';

interface ColumnHandlers {
  onView: (record: API.StrategyItem) => void;
  onEdit: (record: API.StrategyItem) => void;
  onDelete: (guid: string) => void;
  onAssign: (record: API.StrategyItem) => void;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

const StrategyColumns = (
  handlers: ColumnHandlers,
): {
  columns: ProColumns<API.StrategyItem>[];
  mobileColumns: ProColumns<API.StrategyItem>[];
} => {
  const intl = useIntl();

  // 桌面表格与移动端卡片共用同一套操作按钮，权限判断只保留一份。
  const renderActionItems = (record: API.StrategyItem) => (
    <>
      {handlers.canView && (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handlers.onView(record)}
        >
          <FormattedMessage id="pages.strategies.view" defaultMessage="View" />
        </Button>
      )}
      {handlers.canEdit && (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handlers.onEdit(record)}
        >
          <FormattedMessage id="pages.common.edit" defaultMessage="Edit" />
        </Button>
      )}
      {handlers.canAssign && (
        <Button
          type="link"
          size="small"
          icon={<TeamOutlined />}
          onClick={() => handlers.onAssign(record)}
        >
          <FormattedMessage
            id="pages.strategies.assign"
            defaultMessage="Assign"
          />
        </Button>
      )}
      {handlers.canDelete && (
        <Popconfirm
          title={intl.formatMessage({
            id: 'pages.strategies.deleteConfirm',
            defaultMessage: 'Are you sure to delete this strategy?',
          })}
          onConfirm={() => handlers.onDelete(record.guid)}
          okText={intl.formatMessage({
            id: 'pages.common.confirm',
            defaultMessage: 'Yes',
          })}
          cancelText={intl.formatMessage({
            id: 'pages.common.cancel',
            defaultMessage: 'No',
          })}
        >
          <Button variant="link" size="small" danger icon={<DeleteOutlined />}>
            <FormattedMessage
              id="pages.common.delete"
              defaultMessage="Delete"
            />
          </Button>
        </Popconfirm>
      )}
    </>
  );

  const hasAnyAction =
    handlers.canView ||
    handlers.canEdit ||
    handlers.canDelete ||
    handlers.canAssign;

  const columns: ProColumns<API.StrategyItem>[] = [
    {
      title: (
        <FormattedMessage
          id="pages.strategies.name"
          defaultMessage="Strategy Name"
        />
      ),
      dataIndex: 'name',
      width: 200,
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.strategies.searchNamePlaceholder',
          defaultMessage: 'Search by strategy name',
        }),
      },
    },
    {
      title: (
        <FormattedMessage
          id="pages.strategies.rustdeskVersion"
          defaultMessage="RustDesk Version"
        />
      ),
      dataIndex: 'rustdesk_version',
      width: 150,
      search: false,
      render: (_, record) =>
        record.rustdesk_version || (
          <FormattedMessage
            id="pages.strategies.rustdeskVersionAll"
            defaultMessage="All versions"
          />
        ),
    },
    {
      title: (
        <FormattedMessage id="pages.strategies.note" defaultMessage="Note" />
      ),
      dataIndex: 'note',
      width: 200,
      search: false,
      ellipsis: { showTitle: false },
      render: (_, record) => (
        <Tooltip placement="topLeft" title={record.note}>
          {record.note || '-'}
        </Tooltip>
      ),
    },
    {
      title: (
        <FormattedMessage
          id="pages.strategies.updatedAt"
          defaultMessage="Updated At"
        />
      ),
      dataIndex: 'updated_at',
      width: 180,
      search: false,
      hideInTable: !handlers.canView,
      render: (_, record) => {
        if (!record.updated_at) return '-';
        return new Date(record.updated_at).toLocaleString();
      },
    },
    {
      title: (
        <FormattedMessage id="pages.common.action" defaultMessage="Action" />
      ),
      valueType: 'option',
      width: 240,
      fixed: 'right',
      hideInTable: !hasAnyAction,
      render: (_, record) => (
        <Space size={0} separator={<Divider orientation="vertical" />}>
          {renderActionItems(record)}
        </Space>
      ),
    },
  ];

  // 窄屏改成卡片列表：策略名置顶，版本/更新时间纵向排列，操作按钮放在卡片底部。
  const mobileColumns: ProColumns<API.StrategyItem>[] = [
    {
      title: (
        <FormattedMessage
          id="pages.strategies.name"
          defaultMessage="Strategy Name"
        />
      ),
      key: 'mobileCard',
      search: false,
      render: (_, record: API.StrategyItem) => (
        <MobileListCard
          title={record.name}
          rows={[
            {
              label: (
                <FormattedMessage
                  id="pages.strategies.rustdeskVersion"
                  defaultMessage="RustDesk Version"
                />
              ),
              value: record.rustdesk_version || (
                <FormattedMessage
                  id="pages.strategies.rustdeskVersionAll"
                  defaultMessage="All versions"
                />
              ),
            },
            handlers.canView && record.updated_at
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.strategies.updatedAt"
                      defaultMessage="Updated At"
                    />
                  ),
                  value: new Date(record.updated_at).toLocaleString(),
                }
              : null,
          ]}
          note={record.note || undefined}
          actions={
            hasAnyAction ? (
              <Space size={0} separator={<Divider orientation="vertical" />}>
                {renderActionItems(record)}
              </Space>
            ) : undefined
          }
        />
      ),
    },
  ];

  return { columns, mobileColumns };
};

export default StrategyColumns;
