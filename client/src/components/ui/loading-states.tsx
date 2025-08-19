import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Loading skeleton for offer cards
/**
 * Renders the skeleton placeholder UI for an offer card during loading states.
 * @example
 * OfferCardSkeleton()
 * <div className="skeleton-placeholder">...</div>
 * @returns {JSX.Element} The markup for a skeleton offer card with various placeholder sections.
 */
export function OfferCardSkeleton() {
  return (
    <Card data-testid="offer-card-skeleton">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="ml-3 space-y-1 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for dashboard stats
/**
 * Renders a skeleton placeholder for dashboard statistics.
 * @example
 * DashboardStatsSkeleton()
 * // Renders a grid with 4 skeleton card components as placeholders
 * @returns {JSX.Element} A JSX element representing the skeleton structure for dashboard statistics with 4 placeholder cards.
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="dashboard-stats-skeleton">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for payment list
/**
 * Renders a skeleton screen for a payment list during loading state.
 * @example
 * PaymentListSkeleton()
 * // Returns a JSX element representing the skeleton structure.
 * @returns {JSX.Element} A JSX element representing the skeleton structure for a payment list.
 */
export function PaymentListSkeleton() {
  return (
    <div className="space-y-3" data-testid="payment-list-skeleton">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for profile page
/**
 * Renders a skeleton loader for a profile component to indicate loading state visually
 * @example
 * ProfileSkeleton()
 * <div className="space-y-6" data-testid="profile-skeleton">...skeleton loaders...</div>
 * @returns {JSX.Element} A JSX element representing the skeleton UI of a profile.
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="profile-skeleton">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeleton for analytics charts
/**
 * Renders a skeleton loader for an analytics chart, simulating the loading state of the chart component.
 * @example
 * AnalyticsChartSkeleton()
 * // Returns a JSX element with skeleton structure
 * @returns {JSX.Element} JSX element representing the skeleton structure of an analytics chart.
 */
export function AnalyticsChartSkeleton() {
  return (
    <Card data-testid="analytics-chart-skeleton">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

// Generic loading spinner
/**
* Renders a loading spinner with customizable size.
* @example
* LoadingSpinner({ size: "sm" })
* // Returns a small loading spinner element
* @param {Object} size - The size of the spinner. Optional property with values: "sm", "default", or "lg".
* @returns {JSX.Element} A spinning loading indicator element.
**/
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`}
      data-testid="loading-spinner"
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Full page loading state
/**
* Component that renders a loading page with a spinner and a message.
* @example
* PageLoading({ message: "Please wait..." })
* Renders a loading spinner with the message "Please wait...".
* @param {Object} param0 - The props object.
* @param {string} [param0.message] - Optional loading message to display. Defaults to "Loading...".
* @returns {JSX.Element} A JSX element representing the loading screen with a spinner and message.
**/
export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div 
      className="flex items-center justify-center min-h-[400px]" 
      data-testid="page-loading"
    >
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}