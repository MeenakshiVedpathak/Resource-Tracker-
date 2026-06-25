import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Button,
  Tooltip,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  fetchNotifications,
  markAllRead,
  markOneRead,
} from '../store/slices/notificationsSlice';

const typeIconMap = {
  info: { icon: InfoOutlinedIcon, color: 'info' },
  warning: { icon: WarningAmberIcon, color: 'warning' },
  error: { icon: ErrorOutlineIcon, color: 'error' },
  success: { icon: CheckCircleOutlineIcon, color: 'success' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationBell = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);

  const { items: notifications, unreadCount, loading } = useSelector(
    (state) => state.notifications
  );

  const open = Boolean(anchorEl);

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 8, unread: false }));
  }, [dispatch]);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    dispatch(markAllRead());
  };

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification.is_read) {
        dispatch(markOneRead(notification.id));
      }
      handleClose();
      navigate('/notifications');
    },
    [dispatch, navigate]
  );

  const handleViewAll = () => {
    handleClose();
    navigate('/notifications');
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-describedby={open ? 'notifications-popover' : undefined}
          onClick={handleOpen}
          sx={{ color: 'text.secondary' }}
        >
          <Badge
            badgeContent={unreadCount}
            max={99}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                minWidth: 16,
                height: 16,
                padding: '0 4px',
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: 22 }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: 22 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id="notifications-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 0.75,
            width: 360,
            maxWidth: '95vw',
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                color="error"
                size="small"
                sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }}
              />
            )}
          </Box>

          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <Button
                size="small"
                variant="text"
                startIcon={<DoneAllIcon fontSize="small" />}
                onClick={handleMarkAllRead}
                sx={{ fontSize: '0.75rem', py: 0.25 }}
              >
                Mark all read
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Notification list */}
        <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 40, opacity: 0.35 }} />
              <Typography variant="body2">You're all caught up</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notif, idx) => {
                const typeConfig = typeIconMap[notif.type] || typeIconMap.info;
                const Icon = typeConfig.icon;
                const isUnread = !notif.is_read;

                return (
                  <React.Fragment key={notif.id}>
                    <ListItem
                      disablePadding
                      sx={{
                        bgcolor: isUnread
                          ? alpha(theme.palette.primary.main, 0.05)
                          : 'transparent',
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notif)}
                        sx={{ py: 1.5, px: 2, gap: 1.5, alignItems: 'flex-start' }}
                      >
                        {/* Type icon */}
                        <Box
                          sx={{
                            mt: 0.25,
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: alpha(
                              theme.palette[typeConfig.color]?.main || theme.palette.info.main,
                              0.12
                            ),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: 17,
                              color:
                                theme.palette[typeConfig.color]?.main || theme.palette.info.main,
                            }}
                          />
                        </Box>

                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              fontWeight={isUnread ? 600 : 400}
                              sx={{ lineHeight: 1.4, mb: 0.25 }}
                            >
                              {notif.title}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ lineHeight: 1.4 }}
                              >
                                {notif.message}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.disabled"
                                display="block"
                                sx={{ mt: 0.25 }}
                              >
                                {timeAgo(notif.created_at)}
                              </Typography>
                            </>
                          }
                          disableTypography
                        />

                        {isUnread && (
                          <Box
                            sx={{
                              mt: 1,
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                    {idx < notifications.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ px: 2, py: 1.25, textAlign: 'center' }}>
          <Button
            size="small"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={handleViewAll}
            fullWidth
          >
            View all notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
