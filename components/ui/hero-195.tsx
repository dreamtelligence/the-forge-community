import * as React from "react"

import { Card } from "@/components/ui/hero-195-1"

const Hero195 = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card ref={ref} className={className} {...props} />
))
Hero195.displayName = "Hero195"

export { Hero195 }
