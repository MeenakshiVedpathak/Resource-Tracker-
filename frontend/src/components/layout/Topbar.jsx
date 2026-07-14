import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { useTheme } from '@/contexts/ThemeContext';
import UserMenu from './UserMenu';
import { Menu, Sun, Moon } from 'lucide-react';

const Topbar = ({ title }) => {
  const dispatch = useDispatch();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="shrink-0 sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4">

        {/* Sidebar toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-border shrink-0" />

        {/* Brand / page title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {title || 'Resource Tracker'}
          </span>
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">

          {/* Theme toggle — pill style (hidden for now) */}
          {/* <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark
              ? <Sun className="h-4 w-4 text-amber-400" />
              : <Moon className="h-4 w-4" />
            }
          </button>

          <div className="h-5 w-px bg-border" /> */}

          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
