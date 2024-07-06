import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";
import { CanvasLib } from "@sc07-canvas/lib/src/canvas";
import { useAppContext } from "../../contexts/AppContext";
import { Canvas } from "../../lib/canvas";
import { useEffect, useState } from "react";
import { ClientConfig } from "@sc07-canvas/lib/src/net";
import network from "../../lib/network";

const getTimeLeft = (pixels: { available: number }, config: ClientConfig) => {
  // this implementation matches the server's implementation

  const cooldown = CanvasLib.getPixelCooldown(pixels.available + 1, config);
  const pixelExpiresAt =
    Canvas.instance?.lastPlace && Canvas.instance.lastPlace + cooldown * 1000;
  const pixelCooldown = pixelExpiresAt && (Date.now() - pixelExpiresAt) / 1000;

  if (!pixelCooldown) return undefined;
  if (pixelCooldown > 0) return 0;

  return Math.abs(pixelCooldown).toFixed(1);
};

const PlaceCountdown = () => {
  const { pixels, config } = useAppContext<true>();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(pixels, config));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(pixels, config));
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [pixels]);

  return (
    <>
      {timeLeft
        ? pixels.available + 1 < config.canvas.pixel.maxStack && timeLeft + "s"
        : ""}
    </>
  );
};

const OnlineCount = () => {
  const [online, setOnline] = useState<number>();

  useEffect(() => {
    function handleOnline(count: number) {
      setOnline(count);
    }

    network.waitForState("online").then(([count]) => setOnline(count));
    network.on("online", handleOnline);

    return () => {
      network.off("online", handleOnline);
    };
  }, []);

  return <>{typeof online === "number" ? online : "???"}</>;
};

export const CanvasMeta = () => {
  const { canvasPosition, cursorPosition, pixels, config } =
    useAppContext<true>();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <div id="canvas-meta" className="toolbar-box">
        {canvasPosition && (
          <span>
            <button className="btn-link" onClick={onOpen}>
              ({canvasPosition.x}, {canvasPosition.y})
            </button>
            {cursorPosition && (
              <>
                {" "}
                <span className="canvas-meta--cursor-pos">
                  (Cursor: {cursorPosition.x}, {cursorPosition.y})
                </span>
              </>
            )}
          </span>
        )}
        <span>
          Pixels:{" "}
          <span>
            {pixels.available}/{config.canvas.pixel.maxStack}
          </span>{" "}
          <PlaceCountdown />
        </span>
        <span>
          Users Online:{" "}
          <span>
            <OnlineCount />
          </span>
        </span>
      </div>
      <ShareModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
};

const ShareModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: () => void;
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              share modal
            </ModalHeader>
            <ModalBody>
              <p>share the current zoom level & position as a url</p>
              <p>
                params would be not a hash so the server can generate an oembed
              </p>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
