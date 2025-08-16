import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardProps } from "@/components/ui/card";

interface EnhancedCardProps extends CardProps {
  hover?: boolean;
  animation?: "none" | "slide-up" | "slide-down" | "slide-left" | "slide-right";
  delay?: number;
}

const EnhancedCard = forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, hover = false, animation = "none", delay = 0, ...props }, ref) => {
    const animationClasses = {
      "none": "",
      "slide-up": "animate-slide-in-up",
      "slide-down": "animate-slide-in-down", 
      "slide-left": "animate-slide-in-left",
      "slide-right": "animate-slide-in-right"
    };

    const styles = delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

    return (
      <Card
        ref={ref}
        className={cn(
          hover && "card-hover cursor-pointer",
          animationClasses[animation],
          className
        )}
        style={styles}
        {...props}
      />
    );
  }
);

EnhancedCard.displayName = "EnhancedCard";

export { EnhancedCard };
export type { EnhancedCardProps };