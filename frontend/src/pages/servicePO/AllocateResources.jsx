import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PersonRemove as PersonRemoveIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  fetchActiveEmployees,
  selectActiveEmployees,
  selectEmployeesLoading,
} from '../../store/slices/employeeSlice';
import {
  allocateEmployee,
  deallocateEmployee,
  selectServicePOsLoading,
} from '../../store/slices/servicePOSlice';

export default function AllocateResources({ open, onClose, poId, allocatedResources = [] }) {
  const dispatch = useDispatch();
  const employees = useSelector(selectActiveEmployees);
  const empLoading = useSelector(selectEmployeesLoading);
  const actionLoading = useSelector(selectServicePOsLoading);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const allocatedIds = new Set(allocatedResources.map((r) => r.employee_id ?? r.id));

  const availableEmployees = employees.filter((emp) => !allocatedIds.has(emp.id));

  useEffect(() => {
    if (open) {
      dispatch(fetchActiveEmployees());
      setSelectedEmployee(null);
      setLocalError('');
      setLocalSuccess('');
    }
  }, [open, dispatch]);

  const handleAllocate = async () => {
    if (!selectedEmployee) return;
    setLocalError('');
    setLocalSuccess('');
    const result = await dispatch(
      allocateEmployee({ poId, employeeId: selectedEmployee.id })
    );
    if (result?.error) {
      setLocalError(result.error.message || 'Failed to allocate employee');
    } else {
      setLocalSuccess(`${selectedEmployee.full_name} allocated successfully.`);
      setSelectedEmployee(null);
      onClose(true);
    }
  };

  const handleRemoveRequest = (resource) => {
    setRemoveTarget(resource);
    setConfirmRemoveOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    const result = await dispatch(
      deallocateEmployee({ poId, allocationId: removeTarget.allocation_id ?? removeTarget.id })
    );
    if (result?.error) {
      setLocalError(result.error.message || 'Failed to remove employee');
    } else {
      setLocalSuccess(`${removeTarget.employee_name} removed.`);
      onClose(true);
    }
    setConfirmRemoveOpen(false);
    setRemoveTarget(null);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onClose(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Manage Resource Allocation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add or remove employees allocated to this PO.
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          {localError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError('')}>
              {localError}
            </Alert>
          )}
          {localSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLocalSuccess('')}>
              {localSuccess}
            </Alert>
          )}

          {/* Add new employee */}
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              mb: 3,
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Autocomplete
              options={availableEmployees}
              loading={empLoading}
              getOptionLabel={(opt) => `${opt.full_name} (${opt.employee_code})`}
              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              value={selectedEmployee}
              onChange={(_, newVal) => setSelectedEmployee(newVal)}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add Employee"
                  size="small"
                  placeholder="Search by name or code…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {empLoading && <CircularProgress size={14} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'primary.light' }}>
                    {getInitials(option.full_name)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.employee_code} &bull; {option.designation || option.role || 'Employee'}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
            <Button
              variant="contained"
              startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
              onClick={handleAllocate}
              disabled={!selectedEmployee || actionLoading}
              sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', mt: 0.25 }}
            >
              Allocate
            </Button>
          </Box>

          <Divider sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Currently Allocated ({allocatedResources.length})
            </Typography>
          </Divider>

          {allocatedResources.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                No employees allocated to this PO yet.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {allocatedResources.map((resource, idx) => (
                <React.Fragment key={resource.id ?? resource.employee_id ?? idx}>
                  <ListItem
                    disableGutters
                    sx={{ py: 1.2, alignItems: 'center' }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: 13,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                        }}
                      >
                        {getInitials(resource.employee_name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {resource.employee_name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.4 }}>
                          {resource.role && (
                            <Chip
                              label={resource.role}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 11, height: 20 }}
                            />
                          )}
                          {resource.employee_code && (
                            <Typography variant="caption" color="text.secondary">
                              {resource.employee_code}
                            </Typography>
                          )}
                          {resource.hours_logged != null && (
                            <Typography variant="caption" color="text.secondary">
                              &bull; {resource.hours_logged} hrs logged
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Remove from PO">
                        <IconButton
                          edge="end"
                          color="error"
                          size="small"
                          onClick={() => handleRemoveRequest(resource)}
                          disabled={actionLoading}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < allocatedResources.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => onClose(false)}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove confirmation */}
      <ConfirmDialog
        open={confirmRemoveOpen}
        title="Remove Employee"
        content={`Remove "${removeTarget?.employee_name}" from this PO? Their logged hours will be retained.`}
        confirmLabel="Remove"
        confirmColor="error"
        onConfirm={handleRemoveConfirm}
        onCancel={() => {
          setConfirmRemoveOpen(false);
          setRemoveTarget(null);
        }}
      />
    </>
  );
}
