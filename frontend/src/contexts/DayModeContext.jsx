import { createContext, useContext, useEffect, useState } from "react";

const DayModeCtx = createContext(null);
const KEY = "chaioz_day_mode_v1"; // 'morning' | 'evening' | 'auto'

function autoMode() {
  const hour = new Date().getHours();
  // Morning: 5am–2pm (breakfast + early lunch window)
  return hour >= 5 && hour < 14 ? "morning" : "evening";
}

export function DayModeProvider({ children }) {
  const [choice, setChoice] = useState(() => localStorage.getItem(KEY) || "auto");
  const [mode, setMode] = useState(choice === "auto" ? autoMode() : choice);

  useEffect(() => {
    localStorage.setItem(KEY, choice);
    setMode(choice === "auto" ? autoMode() : choice);
  }, [choice]);

  // Re-evaluate auto every 5 minutes in case user leaves the tab open
  useEffect(() => {
    if (choice !== "auto") return;
    const t = setInterval(() => setMode(autoMode()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [choice]);

  const isMorning = mode === "morning";
  const isEvening = mode === "evening";

  return (
    <DayModeCtx.Provider value={{ mode, choice, setChoice, isMorning, isEvening }}>
      {children}
    </DayModeCtx.Provider>
  );
}

export const useDayMode = () => useContext(DayModeCtx);
