import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/utils/cn';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = ({ className, align = 'center', sideOffset = 4, collisionPadding = 8, ...props }) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      // Radix already flips top/bottom on its own to keep the whole popover on-screen (this is
      // what makes DatePicker sometimes open upward near the bottom of a scrolled form, and
      // downward otherwise — intended collision avoidance, not a bug). This just keeps it from
      // ever rendering flush against the viewport edge in that tight-space case.
      collisionPadding={collisionPadding}
      className={cn(
        'z-50 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-elevated outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
);

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
