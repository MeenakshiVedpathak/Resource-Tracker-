import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

/**
 * StatCard — dashboard KPI card.
 *
 * @param {string}  title
 * @param {string|number} value
 * @param {string}  subtitle       - contextual text below value
 * @param {node}    icon
 * @param {string}  color          - 'primary'|'success'|'warning'|'error'|'info'
 * @param {number}  trend          - percentage change (positive/negative/zero)
 * @param {string}  trendLabel     - override auto trend label
 * @param {bool}    loading
 * @param {string}  valuePrefix    - prepend to value (e.g. '₹', '$')
 * @param {string}  valueSuffix    - append to value (e.g. '%', 'hrs')
 * @param {fn}      onClick
 */

const colorMap = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  trendLabel,
  loading = false,
  valuePrefix = '',
  valueSuffix = '',
  onClick,
}) => {
  const theme = useTheme();
  const paletteKey = colorMap[color] || 'primary';
  const paletteColor = theme.palette[paletteKey];

  const trendPositive = trend > 0;
  const trendNegative = trend < 0;
  const trendFlat = trend === 0;

  const TrendIcon = trendPositive
    ? TrendingUpIcon
    : trendNegative
    ? TrendingDownIcon
    : TrendingFlatIcon;

  const trendColor = trendPositive
    ? theme.palette.success.main
    : trendNegative
    ? theme.palette.error.main
    : theme.palette.text.secondary;

  const formattedTrendLabel =
    trendLabel ||
    (trend !== undefined && trend !== null
      ? `${trendPositive ? '+' : ''}${trend}%`
      : null);

  const formattedValue =
    value !== undefined && value !== null
      ? `${valuePrefix}${typeof value === 'number' ? value.toLocaleString() : value}${valueSuffix}`
      : '—';

  return (
    <Card
      elevation={0}
      variant="outlined"
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.15s',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': onClick
          ? {
              boxShadow: theme.shadows[4],
              transform: 'translateY(-1px)',
              borderColor: paletteColor.main,
            }
          : {},
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Color accent strip */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: paletteColor.main,
          borderRadius: '2.5px 2.5px 0 0',
        }}
      />

      <CardContent sx={{ pt: 2.5, pb: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        {/* Top row: title + icon */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            letterSpacing="0.06em"
            textTransform="uppercase"
            sx={{ lineHeight: 1.3, flexShrink: 0, mr: 1 }}
          >
            {loading ? <Skeleton width={100} /> : title}
          </Typography>

          {icon && (
            <Box
              aria-hidden="true"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 1.5,
                bgcolor: alpha(paletteColor.main, 0.1),
                color: paletteColor.main,
                flexShrink: 0,
                '& .MuiSvgIcon-root': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {/* Value */}
        {loading ? (
          <Skeleton variant="text" width={120} height={44} />
        ) : (
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              mb: 0.75,
              color: 'text.primary',
            }}
          >
            {formattedValue}
          </Typography>
        )}

        {/* Trend + subtitle row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {!loading && trend !== undefined && trend !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
              <Typography
                variant="caption"
                sx={{ color: trendColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {formattedTrendLabel}
              </Typography>
            </Box>
          )}

          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              {loading ? <Skeleton width={80} /> : subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
