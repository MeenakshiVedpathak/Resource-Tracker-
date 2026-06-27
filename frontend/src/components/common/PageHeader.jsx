import { cn } from '@/utils/cn';

const PageHeader = ({ title, description, actions, className, children }) => (
  <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-2">
        {actions}
      </div>
    )}
  </div>
);

export default PageHeader;
