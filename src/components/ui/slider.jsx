import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value = [50],
      onValueChange,
      disabled,
      ...props
    },
    ref
  ) => {
    // Calculate the percentage for styling
    const percentage = React.useMemo(() => {
      const val = Array.isArray(value) ? value[0] : value;
      return ((val - min) / (max - min)) * 100;
    }, [value, min, max]);

    // Determine range and track styling based on percentage
    const rangeStyles = React.useMemo(() => {
      // If less than 50%, extend the range
      if (percentage < 50) {
        return { right: "-20px" };
      }
      // If more than 50%, apply rounded corners on both sides
      return {
        borderRadius: "9999px", // Fully rounded
        right: "0",
      };
    }, [percentage]);

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50 cursor-grab data-[disabled]:cursor-not-allowed",
          className
        )}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-6 w-full grow overflow-hidden rounded-full bg-input dark:bg-popover">
          <SliderPrimitive.Range
            className="absolute h-full bg-primary"
            style={rangeStyles}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-7 w-7 rounded-full border-2 border-white bg-black focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-20" />
      </SliderPrimitive.Root>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
