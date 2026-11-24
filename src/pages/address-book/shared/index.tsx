import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, history, useAccess, useIntl } from '@umijs/max';
import {
  App,
  Button,
  Divider,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Space,
} from 'antd';
import MobileListCard from '@/components/MobileListCard';
import React, { useRef, useState } from 'react';
import {
  addSharedAddressBook,
  deleteSharedAddressBooks,
  getWebSharedAddressBooks,
  updateSharedAddressBook,
} from '@/services/rustdesk-console/addressBook';
import ShareAccessModal from './components/ShareAccessModal';
import { DEFAULT_PAGINATION, toTableResult } from '@/utils/pagination';

const SharedAddressBook: React.FC = () => {
  const intl = useIntl();
  const { message: msgApi } = App.useApp();
  const access = useAccess();
  const canManage = access.canAddressBooksEdit || access.canAddressBooksShare;
  const canOpenAccessSettings = access.canAddressBooksView || canManage;
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [accessRecord, setAccessRecord] =
    useState<API.SharedAddressBook | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleCreate = async (values: API.AddSharedAddressBookParams) => {
    try {
      await addSharedAddressBook(values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.addressBook.createSuccess',
          defaultMessage: 'Address book created',
        }),
      );
      setCreateModalVisible(false);
      createForm.resetFields();
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.addressBook.createFailed',
          defaultMessage: 'Failed to create address book',
        }),
      );
    }
  };

  const handleEdit = async (values: API.UpdateSharedAddressBookParams) => {
    try {
      await updateSharedAddressBook(values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.addressBook.updateSuccess',
          defaultMessage: 'Address book updated',
        }),
      );
      setEditModalVisible(false);
      editForm.resetFields();
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.addressBook.updateFailed',
          defaultMessage: 'Failed to update address book',
        }),
      );
    }
  };

  const handleDelete = async (guids: string[]) => {
    try {
      await deleteSharedAddressBooks(guids);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.addressBook.deleteSuccess',
          defaultMessage: 'Address book(s) deleted',
        }),
      );
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.addressBook.deleteFailed',
          defaultMessage: 'Failed to delete address book(s)',
        }),
      );
    }
  };

  const columns: ProColumns<API.SharedAddressBook>[] = [
    {
      title: (
        <FormattedMessage id="pages.addressBook.name" defaultMessage="Name" />
      ),
      dataIndex: 'name',
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.addressBook.searchNamePlaceholder',
          defaultMessage: 'Search by name',
        }),
      },
      render: (_, record: API.SharedAddressBook) => (
        <a
          onClick={() => {
            history.push(`/address-book/shared/${record.guid}`);
          }}
          style={{ cursor: 'pointer' }}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: (
        <FormattedMessage id="pages.addressBook.note" defaultMessage="Note" />
      ),
      dataIndex: 'note',
      ellipsis: true,
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.addressBook.searchNotePlaceholder',
          defaultMessage: 'Search by note',
        }),
      },
    },
    ...(canOpenAccessSettings
      ? [
          {
            title: (
              <FormattedMessage
                id="pages.common.action"
                defaultMessage="Action"
              />
            ),
            valueType: 'option' as const,
            width: 280,
            render: (_: unknown, record: API.SharedAddressBook) => {
              const effectiveRule = record.rule || 0;
              const canShareRecord =
                access.canAddressBooksShare && effectiveRule >= 3;
              const canViewAccess =
                access.canAddressBooksView && effectiveRule >= 1;
              const canEditRecord =
                access.canAddressBooksEdit && effectiveRule >= 2;
              const canDeleteRecord =
                access.canAddressBooksEdit && record.is_owner;
              const canOpenAccessModal = canViewAccess || canShareRecord;
              return canOpenAccessModal || canEditRecord || canDeleteRecord ? (
                <Space size={0} separator={<Divider orientation="vertical" />}>
                  {canOpenAccessModal && (
                    <Button
                      key="shareAccess"
                      type="link"
                      size="small"
                      icon={<ShareAltOutlined />}
                      onClick={() => setAccessRecord(record)}
                    >
                      <FormattedMessage
                        id={
                          canShareRecord
                            ? 'pages.addressBook.shareAccess'
                            : 'pages.addressBook.viewShareSettings'
                        }
                        defaultMessage={
                          canShareRecord ? 'Share' : 'Sharing settings'
                        }
                      />
                    </Button>
                  )}
                  {canEditRecord && (
                    <Button
                      key="edit"
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        editForm.setFieldsValue(record);
                        setEditModalVisible(true);
                      }}
                    >
                      <FormattedMessage
                        id="pages.common.edit"
                        defaultMessage="Edit"
                      />
                    </Button>
                  )}
                  {canDeleteRecord && (
                    <Popconfirm
                      key="delete"
                      title={
                        <FormattedMessage
                          id="pages.addressBook.deleteConfirm"
                          defaultMessage="Are you sure to delete this address book?"
                        />
                      }
                      onConfirm={() => handleDelete([record.guid])}
                      okText={intl.formatMessage({
                        id: 'pages.common.confirm',
                        defaultMessage: 'Yes',
                      })}
                      cancelText={intl.formatMessage({
                        id: 'pages.common.cancel',
                        defaultMessage: 'No',
                      })}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      >
                        <FormattedMessage
                          id="pages.common.delete"
                          defaultMessage="Delete"
                        />
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ) : (
                '-'
              );
            },
          },
        ]
      : []),
  ];

  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const optionColumn = columns.find(
    (column) => column.valueType === 'option',
  );

  // 窄屏改成卡片：名称/备注纵向排列，操作按钮放卡片底部
  const mobileColumns: ProColumns<API.SharedAddressBook>[] = isMobile
    ? [
        {
          title: 'Address Book',
          key: 'mobileCard',
          search: false,
          render: (_: unknown, record: API.SharedAddressBook) => {
            const actions = optionColumn?.render
              ? (optionColumn.render(
                  record.name,
                  record,
                  0,
                  {} as never,
                  {} as never,
                ) as React.ReactNode)
              : undefined;

            return (
              <MobileListCard
                title={
                  <a
                    onClick={() =>
                      history.push(`/address-book/shared/${record.guid}`)
                    }
                  >
                    {record.name}
                  </a>
                }
                rows={[
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
    <PageContainer>
      <ProTable<API.SharedAddressBook>
        className={isMobile ? 'mobile-card-table' : undefined}
        showHeader={!isMobile}
        headerTitle={
          <FormattedMessage
            id="pages.addressBook.shared"
            defaultMessage="Shared Address Books"
          />
        }
        columnsState={{
          persistenceType: 'localStorage',
          persistenceKey: 'shared_address_book_columns_state',
        }}
        actionRef={actionRef}
        rowKey="guid"
        request={async (params) => {
          const result = await getWebSharedAddressBooks({
            pageSize: params.pageSize || 20,
            current: params.current || 1,
            name: params.name,
            note: params.note,
          });
          if (!Array.isArray(result.data) || typeof result.total !== 'number') {
            throw new Error('Invalid shared address book response');
          }
          return toTableResult(result);
        }}
        columns={
          isMobile
            ? [
                ...columns.map(
                  (column): ProColumns<API.SharedAddressBook> => ({
                    ...column,
                    hideInTable: true,
                  }),
                ),
                ...mobileColumns,
              ]
            : [...columns, ...mobileColumns]
        }
        rowSelection={
          !isMobile && access.canAddressBooksEdit
            ? {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (record) => ({
                  disabled: !record.is_owner,
                }),
              }
            : undefined
        }
        pagination={DEFAULT_PAGINATION}
        toolBarRender={() =>
          access.canAddressBooksShare || access.canAddressBooksEdit
            ? [
                access.canAddressBooksShare && (
                  <Button
                    key="create"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    <FormattedMessage
                      id="pages.addressBook.create"
                      defaultMessage="Create Address Book"
                    />
                  </Button>
                ),
                access.canAddressBooksEdit && selectedRowKeys.length > 0 && (
                  <Popconfirm
                    key="batchDelete"
                    title={
                      <FormattedMessage
                        id="pages.addressBook.batchDeleteConfirm"
                        defaultMessage="Are you sure to delete selected address books?"
                      />
                    }
                    onConfirm={() => handleDelete(selectedRowKeys as string[])}
                    okText={intl.formatMessage({
                      id: 'pages.common.confirm',
                      defaultMessage: 'Yes',
                    })}
                    cancelText={intl.formatMessage({
                      id: 'pages.common.cancel',
                      defaultMessage: 'No',
                    })}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      <FormattedMessage
                        id="pages.common.batchDelete"
                        defaultMessage="Batch Delete"
                      />
                    </Button>
                  </Popconfirm>
                ),
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
        scroll={isMobile ? undefined : { x: 800 }}
      />

      <Modal
        title={
          <FormattedMessage
            id="pages.addressBook.create"
            defaultMessage="Create Address Book"
          />
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
      >
        <Form form={createForm} onFinish={handleCreate}>
          <Form.Item
            name="name"
            label={
              <FormattedMessage
                id="pages.addressBook.name"
                defaultMessage="Name"
              />
            }
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.common.pleaseEnterName',
                  defaultMessage: 'Please enter name',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="note"
            label={
              <FormattedMessage
                id="pages.addressBook.note"
                defaultMessage="Note"
              />
            }
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="password"
            label={
              <FormattedMessage
                id="pages.users.password"
                defaultMessage="Password"
              />
            }
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <FormattedMessage
            id="pages.addressBook.edit"
            defaultMessage="Edit Address Book"
          />
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
        }}
        onOk={() => editForm.submit()}
      >
        <Form form={editForm} onFinish={handleEdit}>
          <Form.Item name="guid" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label={
              <FormattedMessage
                id="pages.addressBook.name"
                defaultMessage="Name"
              />
            }
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.common.pleaseEnterName',
                  defaultMessage: 'Please enter name',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="note"
            label={
              <FormattedMessage
                id="pages.addressBook.note"
                defaultMessage="Note"
              />
            }
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <ShareAccessModal
        open={!!accessRecord}
        mode={
          access.canAddressBooksShare && (accessRecord?.rule || 0) >= 3
            ? 'manage'
            : 'view'
        }
        addressBook={accessRecord}
        onOpenChange={(open) => !open && setAccessRecord(null)}
      />
    </PageContainer>
  );
};

export default SharedAddressBook;
