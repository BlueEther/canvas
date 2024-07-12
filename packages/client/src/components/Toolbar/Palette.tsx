import { useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { Canvas } from "../../lib/canvas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { KeybindManager } from "../../lib/keybinds";
import { Button, Link } from "@nextui-org/react";

export const Palette = () => {
  const { config, user, cursor, setCursor } = useAppContext<true>();

  useEffect(() => {
    Canvas.instance?.updateCursor(cursor.color);
  }, [cursor]);

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
            setCursor(({ color, ...cursor }) => {
              return cursor;
            });
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        {config.pallete.colors.map((color) => (
          <button
            key={color.id}
            aria-label={color.name}
            className={["pallete-color", color.id === cursor.color && "active"]
              .filter((a) => a)
              .join(" ")}
            style={{
              backgroundColor: "#" + color.hex,
            }}
            title={color.name}
            onClick={() => {
              setCursor((cursor) => {
                return {
                  ...cursor,
                  color: color.id,
                };
              });
            }}
          ></button>
        ))}
      </div>

      {!user && (
        <div className="pallete-user-overlay">
          {import.meta.env.VITE_INCLUDE_EVENT_INFO ? (
            <>The event hasn't started yet</>
          ) : (
            <>
              You are not logged in
              <Button as={Link} href="/api/login" className="user-login">
                Login
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
