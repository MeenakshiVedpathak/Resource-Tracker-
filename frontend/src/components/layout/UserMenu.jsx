import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog';
import { cn } from '@/utils/cn';

const UserMenu = () => {
  const { user, employee, company, logout } = useAuth();
  const navigate = useNavigate();
  const { error } = useNotification();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // An Employee's name lives on the login response's sibling `employee` object, not `user` —
  // fall back to it first since every other account has no linked Employee at all.
  const displayName = employee?.full_name ?? user?.full_name ?? user?.email ?? '';
  const email = user?.email;
  const roleName = user?.role?.role_name ?? null;

  return (
    <>
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
            {company?.company_name && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{company.company_name}</p>
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
          {company?.company_name && (
            <p className="text-xs text-muted-foreground mt-0.5">{company.company_name}</p>
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

    <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </>
  );
};

export default UserMenu;
