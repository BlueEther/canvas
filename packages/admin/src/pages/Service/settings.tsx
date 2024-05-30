import { BreadcrumbItem, Breadcrumbs, Button, Input } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { api, handleError } from "../../lib/utils";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { toast } from "react-toastify";

export const ServiceSettingsPage = () => {
  return (
    <div className="my-14 lg:px-6 max-w-[95rem] mx-auto w-full flex flex-col gap-4">
      <Breadcrumbs>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem>Service</BreadcrumbItem>
        <BreadcrumbItem>Settings</BreadcrumbItem>
      </Breadcrumbs>

      <h3 className="text-xl font-semibold">Service Settings</h3>
      <CanvasSettings />
    </div>
  );
};

const CanvasSettings = () => {
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  useEffect(() => {
    api<{ size: { width: number; height: number } }>("/api/admin/canvas/size")
      .then(({ status, data }) => {
        if (status === 200) {
          if (data.success) {
            setWidth(data.size.width + "");
            setHeight(data.size.height + "");
          } else {
            handleError(status, data);
          }
        } else {
          handleError(status, data);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const doSaveSize = () => {
    setLoading(true);

    api("/api/admin/canvas/size", "POST", {
      width,
      height,
    })
      .then(({ status, data }) => {
        if (status === 200) {
          if (data.success) {
            toast.success("Canvas size has been changed");
          } else {
            handleError(status, data);
          }
        } else {
          handleError(status, data);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <h4 className="text-l font-semibold">Canvas</h4>
      <div className="relative">
        {loading && <LoadingOverlay />}
        <b>
          Canvas size is resource intensive, this will take a minute to complete
        </b>
        <Input
          type="number"
          size="sm"
          min="100"
          max="10000"
          label="Width"
          value={width}
          onValueChange={setWidth}
        />
        <Input
          type="number"
          size="sm"
          min="100"
          max="10000"
          label="Height"
          value={height}
          onValueChange={setHeight}
        />
        <Button onPress={doSaveSize} isLoading={loading}>
          Save
        </Button>
      </div>
    </>
  );
};
