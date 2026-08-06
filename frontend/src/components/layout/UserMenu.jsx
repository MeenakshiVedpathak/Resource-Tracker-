import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { authApi } from '@/api/auth.api';
import { getInitials } from '@/utils/formatters';
import { ROUTES } from '@/constants/routes';
import { KeyRound, LogOut, ChevronDown } from 'lucide-react';
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
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const { error } = useNotification();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore server errors on logout
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  // full_name/email_id are the actual fields on both the User and Employee login response
  // shapes — name/username/email were never populated, which is why this was blank before.
  const displayName = user?.full_name ?? user?.name ?? user?.username ?? user?.email_id ?? user?.email ?? '';
  const email = user?.email_id ?? user?.email;
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
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </>
  );
};

export default UserMenu;
