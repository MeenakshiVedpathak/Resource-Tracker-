import React from 'react';
import { Chip } from '@mui/material';

/**
 * StatusChip — consistent status indicator.
 *
 * Supported statuses:
 *   active      → success  (green)
 *   inactive    → error    (red)
 *   closed      → warning  (orange)
 *   cancelled   → default  (grey)
 *   pending     → info     (blue)
 *   processing  → info     (blue)
 *   completed   → success  (green)
 *   failed      → error    (red)
 *   draft       → default  (grey)
 *
 * @param {string}  status
 * @param {string}  size      - 'small' (default) | 'medium'
 * @param {string}  variant   - 'filled' (default) | 'outlined'
 * @param {object}  sx
 */

const statusMap = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'error', label: 'Inactive' },
  closed: { color: 'warning', label: 'Closed' },
  cancelled: { color: 'default', label: 'Cancelled' },
  canceled: { color: 'default', label: 'Cancelled' },
  pending: { color: 'info', label: 'Pending' },
  processing: { color: 'info', label: 'Processing' },
  completed: { color: 'success', label: 'Completed' },
  complete: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
  draft: { color: 'default', label: 'Draft' },
  archived: { color: 'default', label: 'Archived' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'error', label: 'Rejected' },
  suspended: { color: 'warning', label: 'Suspended' },
  'on hold': { color: 'warning', label: 'On Hold' },
  onhold: { color: 'warning', label: 'On Hold' },
};

const StatusChip = ({ status, size = 'small', variant = 'filled', sx, label: labelProp }) => {
  const key = (status ?? '').toString().toLowerCase().trim();
  const config = statusMap[key] || { color: 'default', label: status };
  const displayLabel = labelProp || config.label || status;

  return (
    <Chip
      label={displayLabel}
      color={config.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        letterSpacing: '0.02em',
        fontSize: size === 'small' ? '0.72rem' : '0.8125rem',
        height: size === 'small' ? 22 : 28,
        ...sx,
      }}
    />
  );
};

export default StatusChip;
