import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { FormattedMessage, useAccess, useIntl } from '@umijs/max';
import {
  App,
  Breadcrumb,
  Button,
  Drawer,
  Grid,
  Modal,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import {
  disconnectConnection,
  getActiveConnections,
  getConnectionAudits,
  updateConnectionAudit,
} from '@/services/rustdesk-console/audit';
import { DownloadOutlined, EditTwoTone } from '@ant-design/icons';
import type { ConnectionAuditSearchParams } from './types';
import { useConnColumns } from './components/ConnColumns';
import { useDetailFields } from './components/DetailFields';
import { useCsvExport } from './components/useCsvExport';
import { DEFAULT_PAGINATION, toTableResult } from '@/utils/pagination';
import MobileListCard from '@/components/MobileListCard';
import { formatDateTime, renderDuration, renderLocalField } from './utils';
import { getConnTypeMsgId, renderConnTypeIcon } from './connType';
import {
  canDisconnectActiveConnection,
  canDisconnectAuditRecord,
  getConnectionPageMode,
} from './connectionAccess';

const { Text } = Typography;

const ConnectionAudit: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const { message: msgApi } = App.useApp();
  const access = useAccess();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const canEdit = access.isSuperAdmin;
  const canDisconnect = access.canDevicesDisconnect;
  const pageMode = getConnectionPageMode(access.canAuditView);

  const [pageParams, setPageParams] =
    useState<Partial<ConnectionAuditSearchParams>>();
  const [currentRow, setCurrentRow] = useState<API.ConnectionAuditItem>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectConfirmLoading, setDisconnectConfirmLoading] =
    useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    uuid: string;
    connId: number;
  }>();

  const { exportCsv } = useCsvExport({ pageParams });

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnectConfirmLoading(true);
    try {
      const res = await disconnectConnection(disconnectTarget.uuid, [
        disconnectTarget.connId,
      ]);
      if (res.succ !== false) {
        msgApi.success(
          intl.formatMessage({
            id: 'pages.audits.disconnectSuccess',
            defaultMessage: 'Disconnect request submitted',
          }),
        );
        actionRef.current?.reload();
      } else {
        msgApi.error(
          intl.formatMessage({
            id: 'pages.audits.disconnectFailed',
            defaultMessage: 'Disconnect failed!',
          }),
        );
      }
    } catch (error) {
      msgApi.error(
        typeof error === 'string'
          ? error
          : intl.formatMessage({
              id: 'pages.audits.disconnectFailed',
              defaultMessage: 'Disconnect failed!',
            }),
      );
    } finally {
      setDisconnectConfirmLoading(false);
      setDisconnectModalOpen(false);
    }
  };

  const handleUpdateNote = async (
    fields: Pick<API.ConnectionAuditItem, 'note'>,
    old: API.ConnectionAuditItem,
  ) => {
    if (!old.id) return false;
    if ((fields.note || '') === (old.note || '')) return true;

    try {
      await updateConnectionAudit(old.id, { note: fields.note || '' });
      msgApi.success(
        intl.formatMessage({
          id: 'pages.audits.updateSuccess',
          defaultMessage: 'Update is successful',
        }),
      );
      return true;
    } catch (error) {
      msgApi.error(
        typeof error === 'string'
          ? error
          : intl.formatMessage({
              id: 'pages.audits.updateFailed',
              defaultMessage: 'Update failed, please try again!',
            }),
      );
      return false;
    }
  };

  const columns = useConnColumns({
    canEdit,
    canDisconnect,
    onViewDetail: (record) => {
      setCurrentRow(record);
      setDrawerOpen(true);
    },
    onEditNote: (record) => {
      setCurrentRow(record);
      setEditModalVisible(true);
    },
    onDisconnect: (record) => {
      if (!canDisconnectAuditRecord(canDisconnect, record)) return;
      setDisconnectTarget({
        uuid: record.deviceUuid,
        connId: Number(record.connId),
      });
      setDisconnectModalOpen(true);
    },
  });

  const detailFields = useDetailFields();

  const restrictedColumns: ProColumns<API.ActiveConnectionItem>[] = [
    {
      title: (
        <FormattedMessage id="pages.audits.remote" defaultMessage="Remote" />
      ),
      dataIndex: 'deviceId',
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.audits.remotePlaceholder',
          defaultMessage: 'Enter remote device ID',
        }),
      },
    },
    {
      title: (
        <FormattedMessage
          id="pages.audits.connectionId"
          defaultMessage="Connection ID"
        />
      ),
      dataIndex: 'connId',
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.common.action" defaultMessage="Action" />
      ),
      search: false,
      width: 120,
      render: (_, record) =>
        canDisconnectActiveConnection(canDisconnect, record) ? (
          <Button
            size="small"
            type="default"
            danger
            onClick={() => {
              setDisconnectTarget({
                uuid: record.deviceUuid,
                connId: record.connId,
              });
              setDisconnectModalOpen(true);
            }}
          >
            <FormattedMessage
              id="pages.audits.disconnect"
              defaultMessage="Disconnect"
            />
          </Button>
        ) : null,
    },
  ];

  // 窄屏：活动连接改为卡片，设备 ID 作标题，连接 ID 与断开按钮收进行内/底部。
  const restrictedMobileColumns: ProColumns<API.ActiveConnectionItem>[] = [
    {
      title: 'Connection',
      key: 'mobileCard',
      search: false,
      render: (_, record) => (
        <MobileListCard
          title={record.deviceId || '-'}
          rows={[
            {
              label: (
                <FormattedMessage
                  id="pages.audits.connectionId"
                  defaultMessage="Connection ID"
                />
              ),
              value: record.connId,
            },
          ]}
          actions={
            canDisconnectActiveConnection(canDisconnect, record) ? (
              <Button
                size="small"
                danger
                onClick={() => {
                  setDisconnectTarget({
                    uuid: record.deviceUuid,
                    connId: record.connId,
                  });
                  setDisconnectModalOpen(true);
                }}
              >
                <FormattedMessage
                  id="pages.audits.disconnect"
                  defaultMessage="Disconnect"
                />
              </Button>
            ) : undefined
          }
        />
      ),
    },
  ];

  const restrictedTableColumns = isMobile
    ? [
        ...restrictedColumns.map(
          (col): ProColumns<API.ActiveConnectionItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
        ...restrictedMobileColumns,
      ]
    : [
        ...restrictedColumns,
        ...restrictedMobileColumns.map(
          (col): ProColumns<API.ActiveConnectionItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
      ];

  // 连接审计卡片：设备 ID/时间/连接类型/来源/时长 + 详情、备注、断开。
  const connMobileColumns: ProColumns<API.ConnectionAuditItem>[] = [
    {
      title: 'Connection',
      key: 'mobileCard',
      search: false,
      render: (_, record) => (
        <MobileListCard
          title={record.deviceId || '-'}
          subtitle={formatDateTime(record.createdAt)}
          rows={[
            {
              label: (
                <FormattedMessage id="pages.audits.type" defaultMessage="Type" />
              ),
              value: (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {renderConnTypeIcon(record.type)}
                  <span>
                    {intl.formatMessage({ id: getConnTypeMsgId(record.type) })}
                  </span>
                </span>
              ),
            },
            {
              label: (
                <FormattedMessage
                  id="pages.audits.local"
                  defaultMessage="Local"
                />
              ),
              value: renderLocalField(record),
            },
            record.requestedAt
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.audits.requestedAt"
                      defaultMessage="Requested At"
                    />
                  ),
                  value: formatDateTime(record.requestedAt),
                }
              : null,
            record.establishedAt || record.closedAt
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.audits.duration"
                      defaultMessage="Duration"
                    />
                  ),
                  value: renderDuration(record),
                }
              : null,
          ]}
          note={record.note || undefined}
          actions={
            <>
              <Button
                size="small"
                onClick={() => {
                  setCurrentRow(record);
                  setDrawerOpen(true);
                }}
              >
                <FormattedMessage
                  id="pages.audits.detail"
                  defaultMessage="Detail"
                />
              </Button>
              {canEdit && (
                <Button
                  size="small"
                  icon={<EditTwoTone />}
                  aria-label={intl.formatMessage({
                    id: 'pages.common.edit',
                    defaultMessage: 'Edit',
                  })}
                  onClick={() => {
                    setCurrentRow(record);
                    setEditModalVisible(true);
                  }}
                />
              )}
              {canDisconnectAuditRecord(canDisconnect, record) && (
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    setDisconnectTarget({
                      uuid: record.deviceUuid,
                      connId: Number(record.connId),
                    });
                    setDisconnectModalOpen(true);
                  }}
                >
                  <FormattedMessage
                    id="pages.audits.disconnect"
                    defaultMessage="Disconnect"
                  />
                </Button>
              )}
            </>
          }
        />
      ),
    },
  ];

  const connTableColumns = isMobile
    ? [
        ...columns.map(
          (col): ProColumns<API.ConnectionAuditItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
        ...connMobileColumns,
      ]
    : [
        ...columns,
        ...connMobileColumns.map(
          (col): ProColumns<API.ConnectionAuditItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
      ];

  return (
    <PageContainer
      breadcrumbRender={() => (
        <Breadcrumb
          items={[
            {
              title: (
                <FormattedMessage
                  id="menu.list.audit-list"
                  defaultMessage="Audit List"
                />
              ),
            },
            {
              title: (
                <FormattedMessage
                  id="menu.list.audit-list.Connection"
                  defaultMessage="Connection"
                />
              ),
            },
          ]}
        />
      )}
    >
      {pageMode === 'restricted' ? (
        <ProTable<API.ActiveConnectionItem>
          className={isMobile ? 'mobile-card-table' : undefined}
          showHeader={!isMobile}
          headerTitle={
            <FormattedMessage
              id="pages.audits.currentConnections"
              defaultMessage="Current Connections"
            />
          }
          actionRef={actionRef}
          rowKey={(record) => `${record.deviceUuid}-${record.connId}`}
          request={async (params) => {
            const result = await getActiveConnections({
              current: params.current,
              pageSize: params.pageSize,
              deviceId: params.deviceId,
            });
            return toTableResult(result);
          }}
          columns={restrictedTableColumns}
          pagination={
            isMobile
              ? {
                  ...DEFAULT_PAGINATION,
                  showSizeChanger: false,
                  showQuickJumper: false,
                }
              : DEFAULT_PAGINATION
          }
          options={{
            density: true,
            fullScreen: false,
            reload: true,
            setting: false,
          }}
        />
      ) : (
        <ProTable<API.ConnectionAuditItem, ConnectionAuditSearchParams>
          className={isMobile ? 'mobile-card-table' : undefined}
          showHeader={!isMobile}
          headerTitle={
            <FormattedMessage
              id="pages.audits.conn"
              defaultMessage="Connection Audits"
            />
          }
          columnsState={{
            persistenceType: 'localStorage',
            persistenceKey: 'conn_audit_columns_state',
          }}
          actionRef={actionRef}
          rowKey="id"
          request={async (params) => {
            const requestParams: API.ConnectionAuditQueryParams = {
              current: params.current,
              pageSize: params.pageSize,
            };
            if (params.deviceId) {
              requestParams.deviceId = params.deviceId;
            }
            if (params.type !== undefined && params.type !== null) {
              requestParams.type = params.type;
            }
            if (
              params.createdAt &&
              Array.isArray(params.createdAt) &&
              params.createdAt.length === 2
            ) {
              requestParams.startTime = dayjs(
                params.createdAt[0],
              ).toISOString();
              requestParams.endTime = dayjs(params.createdAt[1]).toISOString();
            }
            const result = await getConnectionAudits(requestParams);
            return toTableResult(result);
          }}
          columns={connTableColumns}
          beforeSearchSubmit={(params) => {
            setPageParams(params);
            return params;
          }}
          toolBarRender={() => [
            <Tooltip
              key="export"
              title={intl.formatMessage({
                id: 'pages.audits.exportCsvTip',
                defaultMessage: 'Export up to 1000 records at a time',
              })}
            >
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={exportCsv}
              >
                <FormattedMessage
                  id="pages.audits.exportCSV"
                  defaultMessage="Export CSV"
                />
              </Button>
            </Tooltip>,
          ]}
          pagination={
            isMobile
              ? {
                  ...DEFAULT_PAGINATION,
                  showSizeChanger: false,
                  showQuickJumper: false,
                }
              : DEFAULT_PAGINATION
          }
          scroll={isMobile ? undefined : { x: 'max-content' }}
          options={{
            density: true,
            setting: { listsHeight: 400 },
            fullScreen: false,
            reload: true,
          }}
        />
      )}

      {pageMode === 'full' && (
        <Drawer
          title={
            <FormattedMessage
              id="pages.audits.detail"
              defaultMessage="Detail"
            />
          }
          placement="right"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          size={400}
        >
          {currentRow &&
            detailFields.map((field) => (
              <div
                key={field.dataIndex || field.label}
                style={{ marginBottom: 16 }}
              >
                <Text type="secondary">{field.label}</Text>
                <div>
                  {field.render
                    ? field.render(currentRow)
                    : currentRow[field.dataIndex || 'note'] || '-'}
                </div>
              </div>
            ))}
        </Drawer>
      )}

      {pageMode === 'full' && (
        <ModalForm
          title={
            <FormattedMessage id="pages.common.edit" defaultMessage="Edit" />
          }
          open={editModalVisible}
          width={400}
          initialValues={currentRow}
          modalProps={{ destroyOnHidden: true }}
          onOpenChange={setEditModalVisible}
          onFinish={async (value: Pick<API.ConnectionAuditItem, 'note'>) => {
            if (!currentRow) return false;
            const success = await handleUpdateNote(value, currentRow);
            if (success) {
              setEditModalVisible(false);
              actionRef.current?.reload();
            }
            return success;
          }}
        >
          <ProFormTextArea
            fieldProps={{ autoComplete: 'off' }}
            width="md"
            name="note"
            rules={[{ max: 300 }]}
            label={
              <FormattedMessage id="pages.audits.note" defaultMessage="Note" />
            }
          />
        </ModalForm>
      )}

      <Modal
        title={
          <FormattedMessage
            id="pages.audits.disconnectConfirmTitle"
            defaultMessage="Confirm Operation"
          />
        }
        open={disconnectModalOpen}
        onOk={handleDisconnect}
        onCancel={() => setDisconnectModalOpen(false)}
        confirmLoading={disconnectConfirmLoading}
      >
        <p>
          <FormattedMessage
            id="pages.audits.disconnectConfirmTip"
            defaultMessage="Are you sure you want to disconnect this device?"
          />
        </p>
      </Modal>
    </PageContainer>
  );
};

export default ConnectionAudit;
