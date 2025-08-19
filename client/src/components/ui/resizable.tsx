"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

/**
 * Renders a resizable panel group component with specific styling and additional properties passed as props.
 * @example
 * renderPanelGroup({ className: "custom-class" })
 * // Renders a panel group with the combined default and custom class names and any additional props.
 * @param {Object} props - Props including className and other properties for the ResizablePrimitive.PanelGroup component.
 * @returns {JSX.Element} A ResizablePrimitive.PanelGroup component with custom styling and additional properties.
 */
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

/**
 * A component function that renders a resizable panel handle with optional styling and functionality.
 * @example
 * YourComponent({ withHandle: true, className: "custom-class" })
 * // Returns a JSX element representing a resizable panel handle with custom styling.
 * @param {Object} props - The component properties.
 * @param {boolean} [props.withHandle] - Determines if the handle icon is displayed.
 * @param {string} [props.className] - Additional CSS classes for styling.
 * @param {Object} props...props - Additional props passed to the resizable panel handle.
 * @returns {JSX.Element} A resizable panel handle element with optional handle icon.
 */
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
