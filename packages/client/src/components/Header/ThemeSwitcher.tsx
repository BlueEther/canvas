import "@theme-toggles/react/css/Classic.css"
import { Classic } from "@theme-toggles/react"

import {useTheme} from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@nextui-org/react";
import African3 from '../../sounds/African3.mp3'
import useSound from "use-sound";
import { useAppContext } from "../../contexts/AppContext";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isToggled, setToggle] = useState(false)
  const {uiClickSound} = useAppContext();

  const [African3Sound] = useSound(
    African3,
    { volume: 0.5 }
  );

  useEffect(() => {
    setMounted(true)
    setToggle(theme === 'dark')
  }, [])

  useEffect(() => {
    if (isToggled) {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }, [isToggled])

  if(!mounted) return null

  return (
    <Button onClick={() => { 
      setToggle(!isToggled) 
      if (uiClickSound) {
        African3Sound()
      }
      }} variant="faded">
      <Classic toggled={isToggled} placeholder={undefined} />
      <p>{theme === 'dark' ? "Dark" : "Light"}</p>
    </Button>
  )
};