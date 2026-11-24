import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Button, Grid } from 'antd';
import { PlusOutlined, SelectOutlined } from '@ant-design/icons';
import React from 'react';
import { getPeers } from '@/services/rustdesk-console/addressBook';
import MobileListCard from '@/components/MobileListCard';
import WebClientDeviceLink from '@/components/WebClientDeviceLink';
import { DEFAULT_PAGINATION, toTableResult } from '@/utils/pagination';

interface PeerTableProps {
  abGuid: string | undefined;
  abLoading: boolean;
  columns: ProColumns<API.PeerItem>[];
  selectedTags: string[];
  tagMode: 'union' | 'intersection';
  canWrite: boolean;
  headerTitle: React.ReactNode;
  actionRef: React.MutableRefObject<ActionType | null>;
  onOpenImport: () => void;
  onOpenAddPeer: () => void;
}

const PeerTable: React.FC<PeerTableProps> = ({
  abGuid,
  abLoading,
  columns,
  selectedTags,
  tagMode,
  canWrite,
  headerTitle,
  actionRef,
  onOpenImport,
  onOpenAddPeer,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  const visibleColumns = canWrite
    ? columns
    : columns.filter((column) => column.valueType !== 'option');
  const optionColumn = visibleColumns.find(
    (column) => column.valueType === 'option',
  );
  const tagsColumn = visibleColumns.find((column) => column.dataIndex === 'tags');

  // 窄屏改成卡片：ID/设备/标签/备注纵向排列，编辑删除放在卡片底部
  const mobileColumns: ProColumns<API.PeerItem>[] = isMobile
    ? [
        {
          title: 'Peer',
          key: 'mobileCard',
          search: false,
          render: (_: unknown, record: API.PeerItem) => {
            const peer = record as API.PeerItem & {
              username?: string;
              alias?: string;
            };
            const device =
              peer.username && record.hostname
                ? `${peer.username}@${record.hostname}`
                : record.hostname || peer.username || '-';
            const tagCell = tagsColumn?.render
              ? (tagsColumn.render(
                  record.id,
                  record,
                  0,
                  {} as never,
                  {} as never,
                ) as React.ReactNode)
              : undefined;
            const actions = optionColumn?.render
              ? (optionColumn.render(
                  record.id,
                  record,
                  0,
                  {} as never,
                  {} as never,
                ) as React.ReactNode)
              : undefined;

            return (
              <MobileListCard
                title={peer.alias || record.id}
                subtitle={
                  <>
                    {record.id}
                    <WebClientDeviceLink id={record.id} autoConnect />
                  </>
                }
                rows={[
                  {
                    label: (
                      <FormattedMessage
                        id="pages.addressBook.device"
                        defaultMessage="Device"
                      />
                    ),
                    value: device,
                  },
                  tagCell !== undefined
                    ? {
                        label: (
                          <FormattedMessage
                            id="pages.addressBook.tags"
                            defaultMessage="Tags"
                          />
                        ),
                        value: tagCell,
                      }
                    : null,
                  {
                    label: (
                      <FormattedMessage
                        id="pages.addressBook.note"
                        defaultMessage="Note"
                      />
                    ),
                    value: record.note || '-',
                  },
                ]}
                actions={actions}
              />
            );
          },
        },
      ]
    : [];

  return (
    <ProTable<API.PeerItem>
      key={abGuid || 'loading'}
      className={isMobile ? 'mobile-card-table' : undefined}
      showHeader={!isMobile}
      headerTitle={headerTitle}
      columnsState={{
        persistenceType: 'localStorage',
        persistenceKey: 'personal_address_book_columns_state',
      }}
      actionRef={actionRef}
      rowKey="id"
      loading={abLoading}
      request={async (params) => {
        if (!abGuid) {
          return { data: [], total: 0, success: true };
        }
        const result = await getPeers({
          current: params.current || 1,
          pageSize: params.pageSize || 20,
          ab: abGuid,
          id: params.id,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          tagMode: selectedTags.length > 1 ? tagMode : undefined,
        });
        return toTableResult(result);
      }}
      columns={
        isMobile
          ? [
              ...visibleColumns.map(
                (column): ProColumns<API.PeerItem> => ({
                  ...column,
                  hideInTable: true,
                }),
              ),
              ...mobileColumns,
            ]
          : [...visibleColumns, ...mobileColumns]
      }
      pagination={DEFAULT_PAGINATION}
      scroll={isMobile ? undefined : { x: 1100 }}
      toolBarRender={() =>
        canWrite
          ? [
              <Button
                key="import"
                type="primary"
                icon={<SelectOutlined />}
                onClick={onOpenImport}
              >
                <FormattedMessage
                  id="pages.addressBook.import"
                  defaultMessage="Import from devices"
                />
              </Button>,
              <Button key="add" icon={<PlusOutlined />} onClick={onOpenAddPeer}>
                <FormattedMessage
                  id="pages.addressBook.addPeer"
                  defaultMessage="Add by ID"
                />
              </Button>,
            ]
          : []
      }
      options={{
        density: true,
        setting: {
          listsHeight: 400,
        },
        fullScreen: false,
        reload: true,
      }}
    />
  );
};

export default PeerTable;
