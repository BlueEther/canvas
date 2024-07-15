import { Divider } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { InfoHeader } from "./InfoHeader";
import { InfoText } from "./InfoText";
import { InfoButtons } from "./InfoButtons";
import { motion } from "framer-motion"

/**
 * Information sidebar
 *
 * TODO: add customization for this post-event (#46)
 *
 * @returns
 */
export const InfoSidebar = () => {
  const { infoSidebar, setInfoSidebar } = useAppContext();

  return (
    <div>
      <motion.div
        className="absolute w-screen h-screen z-50 left-0 top-0 bg-black"
        initial={{ opacity: 0, visibility: 'hidden' }} 
        animate={{ opacity: infoSidebar ? 0.25 : 0, visibility: infoSidebar ? 'visible' : 'hidden' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      />
      <motion.div
        className="min-w-[20rem] max-w-[75vw] md:max-w-[30vw] bg-white dark:bg-black flex flex-col justify-between fixed left-0 h-full shadow-xl overflow-y-auto z-50 top-0"
        initial={{ x: '-150%' }} 
        animate={{ x: infoSidebar ? '-50%' : '-150%' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      />
      <motion.div
        className="min-w-[20rem] max-w-[75vw] md:max-w-[30vw] bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between fixed left-0 h-full shadow-xl overflow-y-auto z-50 top-0"
        initial={{ x: '-100%' }} 
        animate={{ x: infoSidebar ? 0 : '-100%' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      >
        <div>
          <InfoHeader setInfoSidebar={setInfoSidebar} />

          <Divider />

          <InfoButtons />
          <InfoText />
        </div>

        <div className="p-2">
          <p className="text-xs text-default-600">Build {__COMMIT_HASH__}</p>
          <div id="grecaptcha-badge"></div>
        </div>
      </motion.div>
    </div>
  );
};
