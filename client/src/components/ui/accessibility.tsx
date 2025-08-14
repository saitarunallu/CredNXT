import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Skip to content link for keyboard navigation
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      data-testid="skip-to-content"
    >
      Skip to main content
    </a>
  );
}

// Visually hidden text for screen readers
interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function VisuallyHidden({ children, asChild = false }: VisuallyHiddenProps) {
  const Component = asChild ? 'span' : 'span';
  
  return (
    <Component className="sr-only" data-testid="visually-hidden">
      {children}
    </Component>
  );
}

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  className?: string;
}

export const FocusTrap = forwardRef<HTMLDivElement, FocusTrapProps>(
  ({ children, enabled = true, className, ...props }, ref) => {
    if (!enabled) {
      return <div className={className} {...props}>{children}</div>;
    }

    return (
      <div
        ref={ref}
        className={cn("focus-trap", className)}
        data-testid="focus-trap"
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusTrap.displayName = 'FocusTrap';

// Announcement for screen readers
interface AnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export function Announcement({ message, priority = 'polite', className }: AnnouncementProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn("sr-only", className)}
      data-testid="announcement"
    >
      {message}
    </div>
  );
}

// Loading announcement
export function LoadingAnnouncement({ message = "Loading content" }: { message?: string }) {
  return <Announcement message={message} priority="polite" />;
}

// Error announcement
export function ErrorAnnouncement({ message }: { message: string }) {
  return <Announcement message={`Error: ${message}`} priority="assertive" />;
}

// Success announcement
export function SuccessAnnouncement({ message }: { message: string }) {
  return <Announcement message={`Success: ${message}`} priority="polite" />;
}