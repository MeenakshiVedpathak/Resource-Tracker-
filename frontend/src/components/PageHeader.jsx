import React from 'react';
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link,
  Divider,
  Skeleton,
  useTheme,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';

/**
 * PageHeader — standardised page header with title, subtitle, breadcrumbs and action.
 *
 * @param {string}        title
 * @param {string}        subtitle
 * @param {Array}         breadcrumbs - [{ label, to }]  last item rendered as current (no link)
 * @param {node|object}   action      - JSX node OR { label, icon, onClick, variant, color, disabled }
 * @param {bool}          loading
 * @param {bool}          divider     - show bottom divider (default true)
 * @param {node}          extra       - additional content aligned right of the title row
 */
const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  action,
  loading = false,
  divider = true,
  extra,
}) => {
  const theme = useTheme();

  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;

    const {
      label,
      icon,
      onClick,
      variant = 'contained',
      color = 'primary',
      disabled = false,
      component,
      to,
    } = action;

    const linkProps =
      component === RouterLink || to
        ? { component: RouterLink, to }
        : {};

    return (
      <Button
        variant={variant}
        color={color}
        onClick={onClick}
        disabled={disabled}
        startIcon={icon}
        size="medium"
        {...linkProps}
        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box sx={{ mb: divider ? 0 : 3 }}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="inherit" />}
          aria-label="breadcrumb"
          sx={{ mb: 1, fontSize: '0.8125rem' }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
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
      )}

      {/* Title row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: divider ? 2 : 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {loading ? (
            <>
              <Skeleton variant="text" width={240} height={36} />
              {subtitle !== undefined && <Skeleton variant="text" width={180} height={22} />}
            </>
          ) : (
            <>
              <Typography
                variant="h5"
                component="h1"
                fontWeight={700}
                sx={{
                  letterSpacing: '-0.3px',
                  lineHeight: 1.2,
                  textWrap: 'balance',
                  color: 'text.primary',
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, lineHeight: 1.5 }}
                >
                  {subtitle}
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, mt: 0.25 }}>
          {extra}
          {renderAction()}
        </Box>
      </Box>

      {divider && <Divider />}
    </Box>
  );
};

export default PageHeader;
