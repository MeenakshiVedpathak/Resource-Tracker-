import { createTheme, alpha } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5c8d',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2332',
      secondary: '#546e7a',
      disabled: '#90a4ae',
    },
    divider: '#e0e7ef',
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 14,
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#546e7a',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.02em',
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      lineHeight: 2,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.1)',
    '0px 1px 5px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06)',
    '0px 2px 8px rgba(0,0,0,0.08), 0px 4px 6px rgba(0,0,0,0.06)',
    '0px 4px 12px rgba(0,0,0,0.08), 0px 6px 10px rgba(0,0,0,0.06)',
    '0px 6px 16px rgba(0,0,0,0.08), 0px 8px 14px rgba(0,0,0,0.06)',
    '0px 8px 20px rgba(0,0,0,0.08), 0px 10px 18px rgba(0,0,0,0.06)',
    '0px 10px 24px rgba(0,0,0,0.08), 0px 12px 22px rgba(0,0,0,0.06)',
    '0px 12px 28px rgba(0,0,0,0.08), 0px 14px 26px rgba(0,0,0,0.06)',
    '0px 14px 32px rgba(0,0,0,0.08), 0px 16px 30px rgba(0,0,0,0.06)',
    '0px 16px 36px rgba(0,0,0,0.08), 0px 18px 34px rgba(0,0,0,0.06)',
    '0px 18px 40px rgba(0,0,0,0.08), 0px 20px 38px rgba(0,0,0,0.06)',
    '0px 20px 44px rgba(0,0,0,0.08), 0px 22px 42px rgba(0,0,0,0.06)',
    '0px 22px 48px rgba(0,0,0,0.08), 0px 24px 46px rgba(0,0,0,0.06)',
    '0px 24px 52px rgba(0,0,0,0.08), 0px 26px 50px rgba(0,0,0,0.06)',
    '0px 26px 56px rgba(0,0,0,0.08), 0px 28px 54px rgba(0,0,0,0.06)',
    '0px 28px 60px rgba(0,0,0,0.08), 0px 30px 58px rgba(0,0,0,0.06)',
    '0px 30px 64px rgba(0,0,0,0.08), 0px 32px 62px rgba(0,0,0,0.06)',
    '0px 32px 68px rgba(0,0,0,0.08), 0px 34px 66px rgba(0,0,0,0.06)',
    '0px 34px 72px rgba(0,0,0,0.08), 0px 36px 70px rgba(0,0,0,0.06)',
    '0px 36px 76px rgba(0,0,0,0.08), 0px 38px 74px rgba(0,0,0,0.06)',
    '0px 38px 80px rgba(0,0,0,0.08), 0px 40px 78px rgba(0,0,0,0.06)',
    '0px 40px 84px rgba(0,0,0,0.08), 0px 42px 82px rgba(0,0,0,0.06)',
    '0px 42px 88px rgba(0,0,0,0.08), 0px 44px 86px rgba(0,0,0,0.06)',
    '0px 44px 92px rgba(0,0,0,0.08), 0px 46px 90px rgba(0,0,0,0.06)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0,0,0,0.12)',
          },
        },
        sizeLarge: {
          padding: '10px 28px',
          fontSize: '0.9375rem',
        },
        sizeSmall: {
          padding: '4px 14px',
          fontSize: '0.8125rem',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.08), 0px 2px 6px rgba(0,0,0,0.06)',
          border: '1px solid #e0e7ef',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 16px',
        },
        title: {
          fontSize: '1rem',
          fontWeight: 600,
        },
        subheader: {
          fontSize: '0.8125rem',
          color: '#546e7a',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#cbd5e1',
            },
            '&:hover fieldset': {
              borderColor: '#94a3b8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        outlined: {
          borderRadius: 8,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            borderBottom: '2px solid #e2e8f0',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        sizeSmall: {
          height: 22,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0px 24px 48px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          padding: '20px 24px 12px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          gap: '8px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: alpha('#1976d2', 0.12),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 0px #e0e7ef',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e0e7ef',
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          '&.Mui-selected': {
            backgroundColor: alpha('#1976d2', 0.1),
            color: '#1976d2',
            '&:hover': {
              backgroundColor: alpha('#1976d2', 0.14),
            },
            '& .MuiListItemIcon-root': {
              color: '#1976d2',
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: '#64748b',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: '0.75rem',
          backgroundColor: '#1e293b',
        },
        arrow: {
          color: '#1e293b',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f1f5f9',
            borderBottom: '2px solid #e2e8f0',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.8125rem',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            color: '#334155',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f1f5f9',
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8fafc',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e2e8f0',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: '0.625rem',
          height: 16,
          minWidth: 16,
          padding: '0 4px',
        },
      },
    },
  },
});
