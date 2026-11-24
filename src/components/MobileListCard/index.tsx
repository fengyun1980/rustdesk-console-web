import React from 'react';

export interface MobileListCardRow {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface MobileListCardProps {
  title: React.ReactNode;
  /** 标题下方的次要信息，例如 ID、邮箱 */
  subtitle?: React.ReactNode;
  /** 标题右侧的状态标记 */
  badge?: React.ReactNode;
  rows?: (MobileListCardRow | null | undefined | false)[];
  /** 标签组，例如角色名 */
  tags?: React.ReactNode;
  note?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * 列表页在窄屏下使用的卡片。
 * 与 global.less 中的 .mobile-card 样式配套，保证全站列表在手机上外观一致。
 */
const MobileListCard: React.FC<MobileListCardProps> = ({
  title,
  subtitle,
  badge,
  rows,
  tags,
  note,
  actions,
}) => {
  const visibleRows = (rows || []).filter(
    (row): row is MobileListCardRow => Boolean(row),
  );

  return (
    <div className="mobile-card">
      <div className="mobile-card__head">
        <span className="mobile-card__title">{title}</span>
        {badge ? <span className="mobile-card__badge">{badge}</span> : null}
      </div>
      {subtitle ? <div className="mobile-card__subtitle">{subtitle}</div> : null}
      {visibleRows.length > 0 && (
        <div className="mobile-card__rows">
          {visibleRows.map((row, index) => (
            <div className="mobile-card__row" key={index}>
              <span className="mobile-card__label">{row.label}</span>
              <span className="mobile-card__value">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {tags ? <div className="mobile-card__tags">{tags}</div> : null}
      {note ? <div className="mobile-card__note">{note}</div> : null}
      {actions ? <div className="mobile-card__actions">{actions}</div> : null}
    </div>
  );
};

export default MobileListCard;
