import { InfoPrivacy } from "./InfoPrivacy";
import { InfoRules } from "./InfoRules";
import { InfoWelcome } from "./InfoWelcome";

export const InfoText = () => {
  return (
    <div className="flex flex-col p-5 py-1 gap-2">
      <InfoWelcome />
      <InfoRules />
      <InfoPrivacy />
    </div>
  )
};

