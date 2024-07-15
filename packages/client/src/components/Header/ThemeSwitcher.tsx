import "@theme-toggles/react/css/Classic.css"
import { Classic } from "@theme-toggles/react"

import {useTheme} from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@nextui-org/react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isToggled, setToggle] = useState(false)

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
    <Button onClick={() => { setToggle(!isToggled) }} variant="ghost">
      <Classic toggled={isToggled} placeholder={undefined} />
      <p>{theme === 'dark' ? "Dark" : "Light"}</p>
    </Button>
  )
};