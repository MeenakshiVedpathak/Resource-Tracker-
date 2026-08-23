import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { authApi } from '@/api/auth.api';
import { getInitials } from '@/utils/formatters';
import { ROUTES } from '@/constants/routes';
import { KeyRound, LogOut, ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog';
import { cn } from '@/utils/cn';

const UserMenu = () => {
  const { employee, logout, roleObjects, businessUnits, activeBuId, setActiveBu } = useAuth();
  const navigate = useNavigate();
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Employee Identity Migration: any employee with more than one BU gets the switcher now —
  // no longer gated to a single role. Switching BU updates the global selection immediately (no
  // re-login, no full page reload) and invalidates React Query so every BU-scoped screen
  // refetches against the newly-selected BU rather than showing stale data from the prior one
  // (same fix already used for the analogous stale-data bug on logout — see useAuth's
  // handleLogout).
  const showBuSwitcher = businessUnits.length > 1;
  const handleBuChange = (value) => {
    setActiveBu(Number(value));
    queryClient.invalidateQueries();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore server errors on logout
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const displayName = employee?.full_name ?? employee?.email ?? '';
  const email = employee?.email;
  const roleName = roleObjects[0]?.name ?? null;
  const activeBuName = businessUnits.find((bu) => bu.id === activeBuId)?.name ?? null;

  return (
    <>
    <div className="flex items-center gap-2">
      {showBuSwitcher && (
        <Select value={activeBuId != null ? String(activeBuId) : ''} onValueChange={handleBuChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs bg-muted/40 border-border/60">
            <SelectValue placeholder="Select BU" />
          </SelectTrigger>
          <SelectContent>
            {businessUnits.map((bu) => (
              <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1.5 hover:bg-accent hover:border-border transition-all outline-none shadow-sm">
          <Avatar className="h-7 w-7 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
              {getInitials(displayName || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none text-foreground">{displayName}</p>
            {!showBuSwitcher && activeBuName && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{activeBuName}</p>
            )}
            {roleName && <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{roleName}</p>}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
          {!showBuSwitcher && activeBuName && (
            <p className="text-xs text-muted-foreground mt-0.5">{activeBuName}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          onSelect={(e) => e.preventDefault()}
          className="text-destructive focus:text-destructive"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>

    <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </>
  );
};

export default UserMenu;
