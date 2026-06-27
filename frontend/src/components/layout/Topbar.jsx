import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { useTheme } from '@/contexts/ThemeContext';
import UserMenu from './UserMenu';
import NotificationPanel from './NotificationPanel';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Topbar = ({ title }) => {
  const dispatch = useDispatch();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-20">
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-4 w-4" />
      </button>

      {title && (
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <NotificationPanel />
        <UserMenu />
      </div>
    </header>
  );
};

export default Topbar;
