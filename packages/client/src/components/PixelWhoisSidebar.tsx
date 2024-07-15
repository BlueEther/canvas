import { Button, Spinner } from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";
import { api } from "../lib/utils";
import { UserCard } from "./Profile/UserCard";

interface IPixel {
  userId: string;
  x: number;
  y: number;
  color: string;
  createdAt: Date;
}

interface IUser {
  sub: string;
  display_name?: string;
  picture_url?: string;
  profile_url?: string;
  isAdmin: boolean;
  isModerator: boolean;
}

interface IInstance {
  hostname: string;
  name?: string;
  logo_url?: string;
  banner_url?: string;
}

export const PixelWhoisSidebar = () => {
  const { pixelWhois, setPixelWhois } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [whois, setWhois] = useState<{
    pixel: IPixel;
    otherPixels: number;
    user: IUser | null;
    instance: IInstance | null;
  }>();

  useEffect(() => {
    if (!pixelWhois) return;
    setLoading(true);
    setWhois(undefined);

    api<
      {
        pixel: IPixel;
        otherPixels: number;
        user: IUser | null;
        instance: IInstance | null;
      },
      "no_pixel"
    >(`/api/canvas/pixel/${pixelWhois.x}/${pixelWhois.y}`)
      .then(({ status, data }) => {
        if (status === 200) {
          if (data.success) {
            setWhois({
              pixel: data.pixel,
              otherPixels: data.otherPixels,
              user: data.user,
              instance: data.instance,
            });
          } else {
            // error wahhhhhh
          }
        } else {
          // error wahhhh
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pixelWhois]);

  return (
    <div
      className="sidebar sidebar-right bg-white dark:bg-black text-black dark:text-white"
      style={{ ...(pixelWhois ? {} : { display: "none" }) }}
    >
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/25 flex justify-center items-center z-50">
          <div className="flex flex-col bg-white p-5 rounded-lg gap-5">
            <Spinner />
            Loading
          </div>
        </div>
      )}
      <header>
        <h1>Pixel Whois</h1>
        <div className="flex-grow"></div>
        <Button size="sm" isIconOnly onClick={() => setPixelWhois(undefined)}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </header>
      <div className="w-full h-52 bg-gray-200 dark:bg-gray-800 flex justify-center items-center">
        <div className="w-[128px] h-[128px] bg-white">
          <SmallCanvas
            surrounding={pixelWhois?.surrounding}
            style={{ width: "100%" }}
          />
        </div>
      </div>
      <section>{whois?.user && <UserCard user={whois.user} />}</section>
      <section>
        <table className="w-full">
          <tr>
            <th>Placed At</th>
            <td>{whois?.pixel.createdAt?.toString()}</td>
          </tr>
          <tr>
            <th>Covered Pixels</th>
            <td>{whois?.otherPixels}</td>
          </tr>
        </table>
      </section>
    </div>
  );
};

const SmallCanvas = ({
  surrounding,
  ...props
}: {
  surrounding: string[][] | undefined;
} & ComponentPropsWithoutRef<"canvas">) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      console.warn("[SmallCanvas] canvasRef unavailable");
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      console.warn("[SmallCanvas] canvas context unavailable");
      return;
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (surrounding) {
      const PIXEL_WIDTH = canvasRef.current.width / surrounding[0].length;
      const middle: [x: number, y: number] = [
        Math.floor(surrounding[0].length / 2),
        Math.floor(surrounding.length / 2),
      ];

      for (let y = 0; y < surrounding.length; y++) {
        for (let x = 0; x < surrounding[y].length; x++) {
          let color = surrounding[y][x];
          ctx.beginPath();
          ctx.rect(x * PIXEL_WIDTH, y * PIXEL_WIDTH, PIXEL_WIDTH, PIXEL_WIDTH);

          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      ctx.beginPath();
      ctx.rect(
        middle[0] * PIXEL_WIDTH,
        middle[1] * PIXEL_WIDTH,
        PIXEL_WIDTH,
        PIXEL_WIDTH
      );
      ctx.strokeStyle = "#f00";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }, [surrounding]);

  return (
    <canvas
      width={300}
      height={300}
      ref={(r) => (canvasRef.current = r)}
      {...props}
    />
  );
};
