import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Shared by Login and Forgot Password — opens whenever either endpoint responds with
// `requiresUserTypeSelection: true` (email belongs to both a User and an Employee account).
// `onSelect(type)` re-submits the original request with the chosen loginType; this component
// just owns the per-button loading state while that resubmission is in flight.
const AccountTypeDialog = ({ open, onOpenChange, message, accountTypes = [], onSelect }) => {
  const [loadingType, setLoadingType] = useState(null);

  const handleSelect = async (type) => {
    setLoadingType(type);
    try {
      await onSelect(type);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Account Type</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {accountTypes.map(({ type, label }) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              className="justify-center"
              disabled={!!loadingType}
              onClick={() => handleSelect(type)}
            >
              {loadingType === type ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  {label}
                </span>
              ) : (
                label
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountTypeDialog;
