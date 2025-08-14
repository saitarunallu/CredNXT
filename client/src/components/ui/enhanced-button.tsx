import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-states";

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    loading = false, 
    loadingText, 
    icon, 
    iconPosition = "left", 
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        className={cn(
          "button-transition relative",
          loading && "cursor-not-allowed opacity-70",
          className
        )}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="sm" />
            {loadingText && <span>{loadingText}</span>}
          </span>
        ) : (
          <span className="flex items-center justify-center space-x-2">
            {icon && iconPosition === "left" && (
              <span className="shrink-0" aria-hidden="true">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === "right" && (
              <span className="shrink-0" aria-hidden="true">{icon}</span>
            )}
          </span>
        )}
      </Button>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton };
export type { EnhancedButtonProps };