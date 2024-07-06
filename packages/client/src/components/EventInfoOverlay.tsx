import React, { useEffect, useRef } from "react";
import { useAppContext } from "../contexts/AppContext";
import { Button } from "@nextui-org/react";

const EVENT_START = 1720756800000; // midnight 7/12/2024 eastern

/**
 * *oh god the terrible code*
 *
 * not sure of another clean way to do this
 *
 * This is used to show details about the event, immediately on page load
 *
 * used by the canvas preview page to get people hyped up for the event (<7 days before)
 */
export const EventInfoOverlay = ({ children }: React.PropsWithChildren) => {
  const { setInfoSidebar, setSettingsSidebar } = useAppContext();
  const $countdown = useRef<HTMLElement | null>(null);

  const getCountdown = () => {
    // date math always confuses me...
    // https://stackoverflow.com/a/7709819

    const now = Date.now();
    const ms = EVENT_START - now;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor(
      ((ms % (1000 * 60 * 60 * 24)) % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.round(
      (((ms % (1000 * 60 * 60 * 24)) % (1000 * 60 * 60)) % (1000 * 60)) / 1000
    );

    return [days, hours, minutes, seconds];
  };

  const updateTime = () => {
    if (!$countdown.current) return;

    const [days, hours, minutes, seconds] = getCountdown();

    $countdown.current.innerText = [
      days && days + "d",
      hours && hours + "h",
      minutes && minutes + "m",
      seconds && seconds + "s",
    ]
      .filter((a) => a)
      .join(" ");

    $countdown.current.title = `${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`;
  };

  useEffect(() => {
    var interval = setInterval(updateTime, 1000);
    updateTime();

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="bg-black text-white p-4 fixed top-0 left-0 w-full z-[9999] flex flex-row"
      style={{
        pointerEvents: "initial",
      }}
    >
      <div>
        <h1 className="text-4xl font-bold">Canvas 2024</h1>
        <h2 ref={(r) => ($countdown.current = r)} className="text-3xl"></h2>
      </div>

      <div className="flex-grow" />

      <div>
        <Button onPress={() => setInfoSidebar(true)}>Info</Button>
        <Button onPress={() => setSettingsSidebar(true)}>Settings</Button>
      </div>
    </div>
  );
};
