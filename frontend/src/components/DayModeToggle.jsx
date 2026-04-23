import { useDayMode } from "@/contexts/DayModeContext";
import { Sun, Moon, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function DayModeToggle() {
  const { mode, choice, setChoice, isMorning } = useDayMode();
  const Icon = isMorning ? Sun : Moon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="day-mode-toggle"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border border-chaioz-line text-chaioz-teal/80 hover:text-chaioz-saffron hover:border-chaioz-saffron transition-colors"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isMorning ? "Morning" : "Evening"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border-chaioz-line text-chaioz-teal w-48">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-chaioz-teal/60">Menu mode</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-chaioz-line" />
        <DropdownMenuRadioGroup value={choice} onValueChange={setChoice}>
          <DropdownMenuRadioItem value="auto" data-testid="mode-auto" className="gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Auto ({mode})
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="morning" data-testid="mode-morning" className="gap-2">
            <Sun className="w-3.5 h-3.5" /> Morning
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="evening" data-testid="mode-evening" className="gap-2">
            <Moon className="w-3.5 h-3.5" /> Evening
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
