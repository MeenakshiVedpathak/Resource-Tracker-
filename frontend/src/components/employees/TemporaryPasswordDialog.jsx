import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Shown exactly once after an Employee is created without an explicit password (§3.1) — the
// backend returns `temporaryPassword` only on that response and it cannot be retrieved again.
const TemporaryPasswordDialog = ({ open, onOpenChange, email, password }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the password is still visible to copy manually.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Temporary password
          </DialogTitle>
          <DialogDescription>
            A login was created for <span className="font-medium text-foreground">{email}</span>.
            This password is shown only once and cannot be retrieved again — copy it now.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm">{password}</code>
          <Button type="button" size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemporaryPasswordDialog;
