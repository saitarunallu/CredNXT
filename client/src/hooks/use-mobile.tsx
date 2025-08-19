import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
* Determines if the current device is a mobile device based on the viewport width.
* @example
* useIsMobile()
* true
* @returns {boolean} Returns `true` if the viewport width is less than the mobile breakpoint, otherwise `false`.
**/
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
