import { faTableCells } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card, CardBody } from "@nextui-org/react";

export const PixelsCard = () => {
  return (
    <Card
      className="xl:max-w-sm bg-primary rounded-xl shadow-md px-3 w-full"
      isPressable
    >
      <CardBody className="py-5">
        <div className="flex gap-2.5 items-center">
          <FontAwesomeIcon icon={faTableCells} size="lg" />
          <div className="flex flex-col">
            <span className="text-white">Pixel Placements</span>
            {/* <span className="text-white text-xs">1.5k Placements</span> */}
          </div>
        </div>
        <div className="flex gap-2.5 py-2 items-center">
          <span className="text-white text-xl font-semibold">
            123,456 pixels
          </span>
          <span className="text-success text-xs">+400 hour</span>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div>
              <span className="font-semibold text-success text-xs">{"↓"}</span>
              <span className="text-xs text-white">123</span>
            </div>
            <span className="text-white text-xs">Empty Pixels</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
