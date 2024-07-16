import { useAppContext } from "../../contexts/AppContext";
import useSound from 'use-sound';
import Coffee1 from '../../sounds/Coffee1.mp3'
import Coffee2 from '../../sounds/Coffee2.mp3'
import African1 from '../../sounds/African1.mp3'
import African2 from '../../sounds/African2.mp3'
import African3 from '../../sounds/African3.mp3'
import African4 from '../../sounds/African4.mp3'
import WoodBlock1 from '../../sounds/Wood Block1.mp3'
import WoodBlock2 from '../../sounds/Wood Block2.mp3'
import WoodBlock3 from '../../sounds/Wood Block3.mp3'
import { Switch } from "@nextui-org/react";
import { useEffect, useState } from "react";
import network from "../../lib/network";
import { Pixel } from "@sc07-canvas/lib/src/net";

export const AudioSettings = () => {
  const {
    placeSound,
    setPlaceSound,
    globalPlaceSound,
    setGlobalPlaceSound,
    disconnectSound,
    setDisconnectSound,
    reconnectSound,
    setReconnectSound,
    pixelAvailableSound,
    setPixelAvailableSound,
    pixelUndoSound,
    setPixelUndoSound,
    uiClickSound,
    setUiClickSound
  } = useAppContext();

  const [Coffee1Sound] = useSound(
    Coffee1,
    { volume: 0.5 }
  );

  const [Coffee2Sound] = useSound(
    Coffee2,
    { volume: 0.5 }
  );

  const [African1Sound] = useSound(
    African1,
    { volume: 0.5 }
  );

  const [African2Sound] = useSound(
    African2,
    { volume: 0.5 }
  );

  const [African3Sound] = useSound(
    African3,
    { volume: 0.5 }
  );

  const [African4Sound] = useSound(
    African4,
    { volume: 0.5 }
  );

  const [WoodBlock1Sound] = useSound(
    WoodBlock1,
    { volume: 0.1 }
  );

  const [WoodBlock2Sound] = useSound(
    WoodBlock2,
    { volume: 0.1 }
  );

  const [WoodBlock3Sound] = useSound(
    WoodBlock3,
    { volume: 0.1 }
  );

  const [pixelsAvailable, setPixelsAvailable] = useState(0)
  const [lastPixelPlaced, setLastPixelPlaced] = useState(0)

  const WoodSounds = [WoodBlock1Sound, WoodBlock2Sound, WoodBlock3Sound]

  useEffect(() => {
    if (!pixelAvailableSound) {
      return;
    }

    function handleAvailable(number: number) {
      if (number > pixelsAvailable) {
        Coffee2Sound()
      }

      setPixelsAvailable(number)
    }

    network.socket.on("availablePixels", handleAvailable);

    return () => {
      network.socket.off("availablePixels", handleAvailable);
    };
  }, [pixelAvailableSound]);

  useEffect(() => {
    if (!placeSound) {
      return;
    }

    function handlePlace(time: number) {
      if (time < lastPixelPlaced) {
        Coffee1Sound()
      }
      setLastPixelPlaced(time)
    }

    network.socket.on("pixelLastPlaced", handlePlace);

    return () => {
      network.socket.off("pixelLastPlaced", handlePlace);
    };
  }, [placeSound]);

  useEffect(() => {
    if (!pixelUndoSound) {
      return;
    }

    function handleUndo(data: { available: false } | { available: true; expireAt: number }) {
      if (!data.available) {
        African1Sound()
      }
    }

    network.socket.on("undo", handleUndo);

    return () => {
      network.socket.off("undo", handleUndo);
    };
  }, [pixelUndoSound]);

  useEffect(() => {
    if (!globalPlaceSound) {
      return;
    }

    function handlePlace({ }: Pixel) {
      WoodSounds[Math.floor(Math.random() * WoodSounds.length)]()
    }

    network.socket.on("pixel", handlePlace);

    return () => {
      network.socket.off("pixel", handlePlace);
    };
  }, [globalPlaceSound]);

  useEffect(() => {
    if (!disconnectSound) {
      return;
    }

    function handleDisconnect() {
      African2Sound()
    }

    network.socket.on("disconnect", handleDisconnect);

    return () => {
      network.socket.off("disconnect", handleDisconnect);
    };
  }, [disconnectSound]);

  useEffect(() => {
    if (!reconnectSound) {
      return;
    }

    function handleConnect() {
      African4Sound()
    }

    network.socket.on("connect", handleConnect);

    return () => {
      network.socket.off("connect", handleConnect);
    };
  }, [reconnectSound]);

  return (
    <div className="flex flex-col gap-4 p-2">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl">Audio</h2>
        <p className="text-xs text-default-600">Sounds that play on events</p>
      </header>
      <section className="flex flex-col gap-2">
        <Switch
          isSelected={pixelAvailableSound}
          onValueChange={(v) =>
            {
              setPixelAvailableSound(v)
              if (v) {
                Coffee2Sound()
              }
            }
          }
        >
          Pixel Available
        </Switch>
        <Switch
          isSelected={placeSound}
          onValueChange={(v) =>
            {
              setPlaceSound(v)
              if (v) {
                Coffee1Sound()
              }
            }
          }
        >
          Pixel Place
        </Switch>
        <Switch
          isSelected={pixelUndoSound}
          onValueChange={(v) =>
            {
              setPixelUndoSound(v)
              if (v) {
                African1Sound()
              }
            }
          }
        >
          Pixel Undo
        </Switch>
        <Switch
          isSelected={uiClickSound}
          onValueChange={(v) =>
            {
              setUiClickSound(v)
              if (v) {
                African3Sound()
              }
            }
          }
        >
          UI Click
        </Switch>
        <Switch
          isSelected={disconnectSound}
          onValueChange={(v) =>
            {
              setDisconnectSound(v)
              if (v) {
                African2Sound()
              }
            }
          }
        >
          Disconnect
        </Switch>
        <Switch
          isSelected={reconnectSound}
          onValueChange={(v) =>
            {
              setReconnectSound(v)
              if (v) {
                African4Sound()
              }
            }
          }
        >
          Reconnect
        </Switch>
        <Switch
          isSelected={globalPlaceSound}
          onValueChange={(v) =>
            {
              setGlobalPlaceSound(v)
              if (v) {
                WoodSounds[Math.floor(Math.random() * WoodSounds.length)]()
              }
            }
          }
        >
          Global Pixel Place ⚠️
        </Switch>
      </section>
    </div>
  );
};
