import { useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { Canvas } from "../../lib/canvas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { IPaletteContext } from "@sc07-canvas/lib/src/net";
import { KeybindManager } from "../../lib/keybinds";

export const Palette = () => {
  const { config, user, setCursor } = useAppContext<true>();
  const [pallete, setPallete] = useState<IPaletteContext>({});

  useEffect(() => {
    Canvas.instance?.updatePallete(pallete);

    setCursor((v) => ({
      ...v,
      color: pallete.color,
    }));
  }, [pallete]);

  useEffect(() => {
    const handleDeselect = () => {
      setCursor((v) => ({
        ...v,
        color: undefined,
      }));
    };

    KeybindManager.addListener("DESELECT_COLOR", handleDeselect);

    return () => {
      KeybindManager.removeListener("DESELECT_COLOR", handleDeselect);
    };
  }, []);

  return (
    <div id="pallete">
      <div className="pallete-colors">
        <button
          aria-label="Deselect Color"
          className="pallete-color--deselect"
          title="Deselect Color"
          onClick={() => {
            setPallete(({ color, ...pallete }) => {
              return pallete;
            });
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        {config.pallete.colors.map((color) => (
          <button
            key={color.id}
            aria-label={color.name}
            className={["pallete-color", color.id === pallete.color && "active"]
              .filter((a) => a)
              .join(" ")}
            style={{
              backgroundColor: "#" + color.hex,
            }}
            title={color.name}
            onClick={() => {
              setPallete((pallete) => {
                return {
                  ...pallete,
                  color: color.id,
                };
              });
            }}
          ></button>
        ))}
      </div>

      {!user && (
        <div className="pallete-user-overlay">
          You are not logged in
          <a href="/api/login" className="user-login">
            Login
          </a>
        </div>
      )}
    </div>
  );
};
