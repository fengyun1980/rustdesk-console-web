import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl } from '@umijs/max';
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
import React, { useRef, useState } from 'react';
import MobileListCard from '@/components/MobileListCard';
import {
  createDeviceGroup,
  deleteDeviceGroup,
  getDeviceGroupList,
  updateDeviceGroup,
} from '@/services/rustdesk-console/deviceGroup';
import { DEFAULT_PAGINATION, toTableResult } from '@/utils/pagination';

const DeviceGroupList: React.FC = () => {
  const intl = useIntl();
  const { message: msgApi } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<API.DeviceGroupItem | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleCreate = async (values: API.CreateDeviceGroupParams) => {
    try {
      await createDeviceGroup(values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.deviceGroups.createSuccess',
          defaultMessage: 'Device group created',
        }),
      );
      setCreateModalVisible(false);
      createForm.resetFields();
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.deviceGroups.createFailed',
          defaultMessage: 'Failed to create device group',
        }),
      );
    }
  };

  const handleEdit = async (
    guid: string,
    values: API.UpdateDeviceGroupParams,
  ) => {
    try {
      await updateDeviceGroup(guid, values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.deviceGroups.updateSuccess',
          defaultMessage: 'Device group updated',
        }),
      );
      setEditModalVisible(false);
      setEditingRecord(null);
      editForm.resetFields();
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.deviceGroups.updateFailed',
          defaultMessage: 'Failed to update device group',
        }),
      );
    }
  };

  const handleDelete = async (guid: string) => {
    try {
      await deleteDeviceGroup(guid);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.deviceGroups.deleteSuccess',
          defaultMessage: 'Device group deleted',
        }),
      );
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.deviceGroups.deleteFailed',
          defaultMessage: 'Failed to delete device group',
        }),
      );
    }
  };

  const openGroup = (record: API.DeviceGroupItem) => {
    history.push(`/groups/device/${record.guid}`, {
      name: record.name,
    });
  };

  // 桌面表格与移动端卡片共用同一套操作，避免权限/回调逻辑出现两份。
  const renderActions = (record: API.DeviceGroupItem) => (
    <Space size={0} separator={<Divider orientation="vertical" />}>
      <Button
        key="edit"
        type="link"
        size="small"
        onClick={() => {
          setEditingRecord(record);
          editForm.setFieldsValue(record);
          setEditModalVisible(true);
        }}
      >
        <FormattedMessage id="pages.common.edit" defaultMessage="Edit" />
      </Button>
      <Popconfirm
        key="delete"
        title={
          <FormattedMessage
            id="pages.deviceGroups.deleteConfirm"
            defaultMessage="Are you sure to delete this device group?"
          />
        }
        onConfirm={() => handleDelete(record.guid)}
        okText={intl.formatMessage({
          id: 'pages.common.confirm',
          defaultMessage: 'Yes',
        })}
        cancelText={intl.formatMessage({
          id: 'pages.common.cancel',
          defaultMessage: 'No',
        })}
      >
        <Button variant="link" size="small" danger>
          <FormattedMessage id="pages.common.delete" defaultMessage="Delete" />
        </Button>
      </Popconfirm>
    </Space>
  );

  const desktopColumns: ProColumns<API.DeviceGroupItem>[] = [
    {
      title: (
        <FormattedMessage id="pages.deviceGroups.name" defaultMessage="Name" />
      ),
      dataIndex: 'name',
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.deviceGroups.searchNamePlaceholder',
          defaultMessage: 'Search by name',
        }),
      },
      render: (_, record: API.DeviceGroupItem) => (
        <a onClick={() => openGroup(record)} style={{ cursor: 'pointer' }}>
          {record.name}
        </a>
      ),
    },
    {
      title: (
        <FormattedMessage id="pages.deviceGroups.note" defaultMessage="Note" />
      ),
      dataIndex: 'note',
      ellipsis: true,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.common.action" defaultMessage="Action" />
      ),
      valueType: 'option',
      width: 180,
      render: (_, record) => renderActions(record),
    },
  ];

  // 窄屏改成卡片列表：组名 + GUID 置顶，备注/创建时间纵向排列，操作按钮放在卡片底部。
  const mobileColumns: ProColumns<API.DeviceGroupItem>[] = [
    {
      title: (
        <FormattedMessage id="pages.deviceGroups.name" defaultMessage="Name" />
      ),
      key: 'mobileCard',
      search: false,
      render: (_, record: API.DeviceGroupItem) => (
        <MobileListCard
          title={
            <a onClick={() => openGroup(record)} style={{ cursor: 'pointer' }}>
              {record.name}
            </a>
          }
          subtitle={record.guid}
          rows={[
            record.note
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.deviceGroups.note"
                      defaultMessage="Note"
                    />
                  ),
                  value: record.note,
                }
              : null,
            record.created_at
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.deviceGroups.createdAt"
                      defaultMessage="Created At"
                    />
                  ),
                  value: new Date(record.created_at).toLocaleString(),
                }
              : null,
          ]}
          actions={renderActions(record)}
        />
      ),
    },
  ];

  const tableColumns = isMobile
    ? [
        // 保留原列定义给查询表单使用，表格里只渲染卡片列
        ...desktopColumns.map(
          (col): ProColumns<API.DeviceGroupItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
        ...mobileColumns,
      ]
    : [
        ...desktopColumns,
        ...mobileColumns.map(
          (col): ProColumns<API.DeviceGroupItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
      ];

  return (
    <PageContainer>
      <ProTable<API.DeviceGroupItem>
        className={isMobile ? 'mobile-card-table' : undefined}
        showHeader={!isMobile}
        headerTitle={
          <FormattedMessage
            id="pages.deviceGroups.list"
            defaultMessage="Device Groups"
          />
        }
        columnsState={{
          persistenceType: 'localStorage',
          persistenceKey: 'device_group_list_columns_state',
        }}
        actionRef={actionRef}
        rowKey="guid"
        request={async (params) => {
          const result = await getDeviceGroupList({
            current: params.current || 1,
            pageSize: params.pageSize || 20,
            name: params.name,
          });
          return toTableResult(result);
        }}
        columns={tableColumns}
        pagination={
          isMobile
            ? {
                ...DEFAULT_PAGINATION,
                simple: true,
                showSizeChanger: false,
                showQuickJumper: false,
              }
            : DEFAULT_PAGINATION
        }
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            onClick={() => setCreateModalVisible(true)}
          >
            <FormattedMessage
              id="pages.deviceGroups.create"
              defaultMessage="Create Device Group"
            />
          </Button>,
        ]}
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
            id="pages.deviceGroups.create"
            defaultMessage="Create Device Group"
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
                id="pages.deviceGroups.name"
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
                id="pages.deviceGroups.note"
                defaultMessage="Note"
              />
            }
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <FormattedMessage
            id="pages.deviceGroups.edit"
            defaultMessage="Edit Device Group"
          />
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRecord(null);
        }}
        onOk={() => editForm.submit()}
      >
        <Form
          form={editForm}
          onFinish={(values) => {
            if (editingRecord) {
              handleEdit(editingRecord.guid, values);
            }
          }}
        >
          <Form.Item
            name="name"
            label={
              <FormattedMessage
                id="pages.deviceGroups.name"
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
                id="pages.deviceGroups.note"
                defaultMessage="Note"
              />
            }
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DeviceGroupList;
