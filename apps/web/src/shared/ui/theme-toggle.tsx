"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { appShell } from "@/shared/theme/app-theme";

const THEMES = [
  { value: "light", label: "Светлая", Icon: Sun },
  { value: "dark", label: "Тёмная", Icon: Moon },
  { value: "system", label: "Системная", Icon: Monitor },
] as const;

interface ThemeOptionButtonProps {
  active: boolean;
  label: string;
  Icon: typeof Sun;
  onSelect: () => void;
}

function ThemeOptionButton({ active, label, Icon, onSelect }: ThemeOptionButtonProps) {
  if (active) {
    return (
      <button
        aria-label={label}
        aria-pressed="true"
        className={appShell.themeToggleButtonActive}
        title={label}
        type="button"
        onClick={onSelect}
      >
        <Icon aria-hidden className={appShell.themeToggleIcon} />
      </button>
    );
  }

  return (
    <button
      aria-label={label}
      aria-pressed="false"
      className={appShell.themeToggleButton}
      title={label}
      type="button"
      onClick={onSelect}
    >
      <Icon aria-hidden className={appShell.themeToggleIcon} />
    </button>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span aria-hidden className={appShell.themeTogglePlaceholder} />;
  }

  return (
    <div aria-label="Тема оформления" className={appShell.themeToggleGroup} role="group">
      {THEMES.map(({ value, label, Icon }) => (
        <ThemeOptionButton
          key={value}
          active={theme === value}
          Icon={Icon}
          label={label}
          onSelect={() => setTheme(value)}
        />
      ))}
    </div>
  );
}
