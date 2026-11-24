import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, PageContainer, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, history, useAccess, useIntl } from '@umijs/max';
import {
  App,
  Button,
  Divider,
  Form,
  Grid,
  Input,
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import MobileListCard from '@/components/MobileListCard';
import {
  createUserGroup,
  deleteUserGroup,
  getUserGroupList,
  updateUserGroup,
} from '@/services/rustdesk-console/userGroup';
import UserGroupMembersModal from './components/UserGroupMembersModal';
import { DEFAULT_PAGINATION, toTableResult } from '@/utils/pagination';

const UserGroupList: React.FC = () => {
  const intl = useIntl();
  const { message: msgApi } = App.useApp();
  const access = useAccess();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<API.UserGroupItem | null>(
    null,
  );
  const [membersGroup, setMembersGroup] = useState<API.UserGroupItem | null>(
    null,
  );

  const [form] = Form.useForm();

  const handleCreate = async (values: API.CreateUserGroupParams) => {
    try {
      await createUserGroup(values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.userGroups.createSuccess',
          defaultMessage: 'User group created',
        }),
      );
      setCreateModalVisible(false);
      form.resetFields();
      actionRef.current?.reload();
      return true;
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.userGroups.createFailed',
          defaultMessage: 'Failed to create user group',
        }),
      );
      return false;
    }
  };

  const handleUpdate = async (values: API.UpdateUserGroupParams) => {
    if (!currentGroup) return;
    try {
      await updateUserGroup(currentGroup.guid, values);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.userGroups.updateSuccess',
          defaultMessage: 'User group updated',
        }),
      );
      setEditModalVisible(false);
      setCurrentGroup(null);
      form.resetFields();
      actionRef.current?.reload();
      return true;
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.userGroups.updateFailed',
          defaultMessage: 'Failed to update user group',
        }),
      );
      return false;
    }
  };

  const handleDelete = async (guid: string) => {
    try {
      await deleteUserGroup(guid);
      msgApi.success(
        intl.formatMessage({
          id: 'pages.userGroups.deleteSuccess',
          defaultMessage: 'User group deleted',
        }),
      );
      actionRef.current?.reload();
    } catch {
      msgApi.error(
        intl.formatMessage({
          id: 'pages.userGroups.deleteFailed',
          defaultMessage: 'Failed to delete user group',
        }),
      );
    }
  };

  const openGroup = (record: API.UserGroupItem) => {
    history.push(`/groups/user/${record.guid}`, {
      name: record.name,
    });
  };

  const hasAnyAction =
    access.canUserGroupsMembership ||
    access.canUserGroupsEdit ||
    access.canUserGroupsDelete;

  // 桌面表格与移动端卡片共用同一套操作，权限判断只保留一份。
  const renderActions = (record: API.UserGroupItem) => (
    <Space size={0} separator={<Divider orientation="vertical" />}>
      {access.canUserGroupsMembership && (
        <Button
          type="link"
          size="small"
          icon={<TeamOutlined />}
          onClick={() => setMembersGroup(record)}
        >
          <FormattedMessage
            id="pages.userGroups.members"
            defaultMessage="Members"
          />
        </Button>
      )}
      {access.canUserGroupsEdit && (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setCurrentGroup(record);
            form.setFieldsValue(record);
            setEditModalVisible(true);
          }}
        >
          <FormattedMessage id="pages.common.edit" defaultMessage="Edit" />
        </Button>
      )}
      {access.canUserGroupsDelete &&
        (record.is_default ? (
          <Button
            type="link"
            size="small"
            danger
            disabled
            icon={<DeleteOutlined />}
          >
            <FormattedMessage
              id="pages.common.delete"
              defaultMessage="Delete"
            />
          </Button>
        ) : (
          <Popconfirm
            title={intl.formatMessage({
              id: 'pages.userGroups.deleteConfirm',
              defaultMessage: 'Delete this user group?',
            })}
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
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              <FormattedMessage
                id="pages.common.delete"
                defaultMessage="Delete"
              />
            </Button>
          </Popconfirm>
        ))}
    </Space>
  );

  const desktopColumns: ProColumns<API.UserGroupItem>[] = [
    {
      title: (
        <FormattedMessage
          id="pages.userGroups.name"
          defaultMessage="Group Name"
        />
      ),
      dataIndex: 'name',
      width: 200,
      fieldProps: {
        placeholder: intl.formatMessage({
          id: 'pages.userGroups.searchNamePlaceholder',
          defaultMessage: 'Search by name',
        }),
      },
      render: (_, record) => (
        <Space>
          <a onClick={() => openGroup(record)} style={{ cursor: 'pointer' }}>
            {record.name}
          </a>
          {record.is_default && (
            <Tag color="blue">
              <FormattedMessage
                id="pages.userGroups.default"
                defaultMessage="Default"
              />
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage id="pages.userGroups.note" defaultMessage="Note" />
      ),
      dataIndex: 'note',
      width: 250,
      ellipsis: true,
      search: false,
      render: (_, record) => record.note || '-',
    },
    {
      title: (
        <FormattedMessage
          id="pages.userGroups.userCount"
          defaultMessage="User Count"
        />
      ),
      dataIndex: 'user_count',
      width: 120,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.common.action" defaultMessage="Action" />
      ),
      valueType: 'option',
      width: 200,
      fixed: 'right',
      hideInTable: !hasAnyAction,
      render: (_, record) => renderActions(record),
    },
  ];

  // 窄屏改成卡片列表：组名 + 默认标记置顶，备注/成员数纵向排列，操作按钮放在卡片底部。
  const mobileColumns: ProColumns<API.UserGroupItem>[] = [
    {
      title: (
        <FormattedMessage
          id="pages.userGroups.name"
          defaultMessage="Group Name"
        />
      ),
      key: 'mobileCard',
      search: false,
      render: (_, record: API.UserGroupItem) => (
        <MobileListCard
          title={
            <a onClick={() => openGroup(record)} style={{ cursor: 'pointer' }}>
              {record.name}
            </a>
          }
          badge={
            record.is_default ? (
              <Tag color="blue">
                <FormattedMessage
                  id="pages.userGroups.default"
                  defaultMessage="Default"
                />
              </Tag>
            ) : undefined
          }
          rows={[
            record.note
              ? {
                  label: (
                    <FormattedMessage
                      id="pages.userGroups.note"
                      defaultMessage="Note"
                    />
                  ),
                  value: record.note,
                }
              : null,
            {
              label: (
                <FormattedMessage
                  id="pages.userGroups.userCount"
                  defaultMessage="User Count"
                />
              ),
              value: record.user_count ?? 0,
            },
          ]}
          actions={hasAnyAction ? renderActions(record) : undefined}
        />
      ),
    },
  ];

  const tableColumns = isMobile
    ? [
        // 保留原列定义给查询表单使用，表格里只渲染卡片列
        ...desktopColumns.map(
          (col): ProColumns<API.UserGroupItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
        ...mobileColumns,
      ]
    : [
        ...desktopColumns,
        ...mobileColumns.map(
          (col): ProColumns<API.UserGroupItem> => ({
            ...col,
            hideInTable: true,
          }),
        ),
      ];

  return (
    <PageContainer>
      <ProTable<API.UserGroupItem>
        className={isMobile ? 'mobile-card-table' : undefined}
        showHeader={!isMobile}
        headerTitle={
          <FormattedMessage
            id="pages.userGroups.list"
            defaultMessage="User Group List"
          />
        }
        columnsState={{
          persistenceType: 'localStorage',
          persistenceKey: 'user_group_list_columns_state',
        }}
        actionRef={actionRef}
        rowKey="guid"
        request={async (params) => {
          const result = await getUserGroupList({
            current: params.current,
            pageSize: params.pageSize,
            search: params.name,
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
        scroll={isMobile ? undefined : { x: 800 }}
        toolBarRender={() =>
          access.canUserGroupsCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  <FormattedMessage
                    id="pages.userGroups.create"
                    defaultMessage="Create User Group"
                  />
                </Button>,
              ]
            : []
        }
        options={{
          density: true,
          setting: { listsHeight: 400 },
          fullScreen: false,
          reload: true,
        }}
      />

      <ModalForm
        title={
          <FormattedMessage
            id="pages.userGroups.create"
            defaultMessage="Create User Group"
          />
        }
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        onFinish={handleCreate}
        form={form}
        layout="vertical"
        modalProps={{ destroyOnHidden: true }}
      >
        <Form.Item
          name="name"
          label={
            <FormattedMessage
              id="pages.userGroups.name"
              defaultMessage="Name"
            />
          }
          rules={[{ required: true }]}
        >
          <Input
            placeholder={intl.formatMessage({
              id: 'pages.userGroups.enterName',
              defaultMessage: 'Enter group name',
            })}
          />
        </Form.Item>
        <Form.Item
          name="note"
          label={
            <FormattedMessage
              id="pages.userGroups.note"
              defaultMessage="Note"
            />
          }
        >
          <Input.TextArea
            rows={3}
            placeholder={intl.formatMessage({
              id: 'pages.common.enterDescription',
              defaultMessage: 'Enter description',
            })}
          />
        </Form.Item>
      </ModalForm>

      <ModalForm
        title={
          <FormattedMessage
            id="pages.userGroups.edit"
            defaultMessage="Edit User Group"
          />
        }
        open={editModalVisible}
        onOpenChange={setEditModalVisible}
        onFinish={handleUpdate}
        form={form}
        layout="vertical"
        modalProps={{ destroyOnHidden: true }}
      >
        <Form.Item
          name="name"
          label={
            <FormattedMessage
              id="pages.userGroups.name"
              defaultMessage="Name"
            />
          }
          rules={[{ required: true }]}
        >
          <Input
            placeholder={intl.formatMessage({
              id: 'pages.userGroups.enterName',
              defaultMessage: 'Enter group name',
            })}
          />
        </Form.Item>
        <Form.Item
          name="note"
          label={
            <FormattedMessage
              id="pages.userGroups.note"
              defaultMessage="Note"
            />
          }
        >
          <Input.TextArea
            rows={3}
            placeholder={intl.formatMessage({
              id: 'pages.common.enterDescription',
              defaultMessage: 'Enter description',
            })}
          />
        </Form.Item>
      </ModalForm>

      <UserGroupMembersModal
        open={!!membersGroup}
        group={membersGroup}
        isSuperAdmin={access.isSuperAdmin}
        canViewUsers={access.canUsersView}
        onOpenChange={(open) => !open && setMembersGroup(null)}
        onChanged={() => actionRef.current?.reload()}
      />
    </PageContainer>
  );
};

export default UserGroupList;
