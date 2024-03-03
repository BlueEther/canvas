import { faFlag } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card, CardBody } from "@nextui-org/react";

export const ReportsCard = () => {
  return (
    <Card
      className="xl:max-w-sm bg-default-50 rounded-xl shadow-md px-3 w-full"
      isPressable
    >
      <CardBody className="py-5">
        <div className="flex gap-2.5 items-center">
          <FontAwesomeIcon icon={faFlag} size="lg" />
          <div className="flex flex-col">
            <span className="text-white">Reports</span>
            {/* <span className="text-white text-xs">3k online</span> */}
          </div>
        </div>
        <div className="flex gap-2.5 py-2 items-center">
          <span className="text-white text-xl font-semibold">10 reports</span>
          <span className="text-danger text-xs">+400 hour</span>
        </div>
      </CardBody>
    </Card>
  );
};
