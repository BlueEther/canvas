import { Spinner } from "@nextui-org/react";

export const LoadingOverlay = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full z-[9999] backdrop-blur-sm bg-black/30 text-white flex items-center justify-center">
      <Spinner label="Loading..." />
    </div>
  );
};
