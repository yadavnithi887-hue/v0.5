import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "glass-button hover:text-white", // Glassmorphism style
    ghost: "hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white rounded-md",
    outline: "border border-[#454545] bg-transparent hover:bg-[#2a2d2e] text-[#cccccc] rounded-md",
    secondary: "bg-[#3c3c3c] text-white hover:bg-[#4c4c4c] rounded-md",
    destructive: "bg-red-900 text-red-200 hover:bg-red-800 rounded-md",
  }

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  }

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }