import React, { useMemo } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

/**
 * BreadcrumbNav — auto-generates MUI breadcrumbs from the current URL path.
 *
 * Static segment labels come from the routeLabelMap.
 * Dynamic segments (e.g. :id) are displayed as the raw param value
 * unless a context label is provided via the `labels` prop.
 *
 * @param {object} labels  - override dynamic segment labels: { id: 'John Doe' }
 */

const routeLabelMap = {
  '': 'Home',
  login: 'Login',
  employees: 'Employees',
  new: 'New',
  edit: 'Edit',
  users: 'Users',
  roles: 'Roles',
  clients: 'Clients',
  'service-pos': 'Service POs',
  'sub-projects': 'Sub Projects',
  'monthly-costs': 'Monthly Costs',
  timesheets: 'Timesheets',
  upload: 'Upload',
  reports: 'Reports',
  utilization: 'Utilization',
  billing: 'Billing',
  cost: 'Cost',
  settings: 'Settings',
  notifications: 'Notifications',
  '403': '403',
  '404': '404',
};

const isNumericOrId = (segment) => /^\d+$/.test(segment);

const BreadcrumbNav = ({ labels = {} }) => {
  const location = useLocation();

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);

    const items = [{ label: 'Home', to: '/' }];

    segments.forEach((segment, idx) => {
      const to = '/' + segments.slice(0, idx + 1).join('/');

      // Dynamic id segment — use provided label or fallback to segment value
      if (isNumericOrId(segment)) {
        const overrideLabel = labels[segment] || labels['id'];
        if (overrideLabel) {
          items.push({ label: overrideLabel, to });
        } else {
          // Skip raw numeric IDs in breadcrumb if there's no label
          return;
        }
      } else {
        const label = routeLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        items.push({ label, to });
      }
    });

    return items;
  }, [location.pathname, labels]);

  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
      aria-label="breadcrumb"
      sx={{ fontSize: '0.8125rem' }}
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        if (isLast) {
          return (
            <Typography
              key={idx}
              variant="body2"
              color="text.primary"
              fontWeight={500}
              sx={{ fontSize: 'inherit' }}
            >
              {crumb.label}
            </Typography>
          );
        }
        return (
          <Link
            key={idx}
            component={RouterLink}
            to={crumb.to}
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: 'inherit' }}
          >
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default BreadcrumbNav;
