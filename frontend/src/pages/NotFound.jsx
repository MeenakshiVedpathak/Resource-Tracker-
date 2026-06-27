import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-8xl font-bold text-primary/20 tabular-nums">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <Button className="mt-8" onClick={() => navigate(ROUTES.DASHBOARD)}>
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
