import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group bg-background text-primary border-input"
      style={{
        "--normal-bg": "var(--background)",
        "--normal-text": "var(--primary)",
        "--normal-border": "var(--input)",
      }}
      {...props}
    />
  );
};

export { Toaster };
