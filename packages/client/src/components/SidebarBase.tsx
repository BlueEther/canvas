import { motion } from "framer-motion"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Button, Divider } from "@nextui-org/react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import African3 from '../sounds/African3.mp3'
import useSound from "use-sound";
import { useAppContext } from "../contexts/AppContext";

/**
 * Information sidebar
 *
 * TODO: add customization for this post-event (#46)
 *
 * @returns
 */
export const SidebarBase = ({children, shown, icon, setSidebarShown, title, description, side}: { children: string | JSX.Element | JSX.Element[], icon: IconProp, shown: boolean, setSidebarShown: (value: boolean) => void, title: string, description: string, side: "Left" | "Right" }) => {
  const { uiClickSound } = useAppContext();

  const [African3Sound] = useSound(
    African3,
    { volume: 0.5 }
  );
  
  return (
    <div>
      <motion.div
        className={`absolute w-screen h-screen z-50 left-0 top-0 bg-black pointer-events-none`}
        initial={{ opacity: 0, visibility: 'hidden' }} 
        animate={{ opacity: shown ? 0.25 : 0, visibility: shown ? 'visible' : 'hidden' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      />
      <motion.div
        className={`min-w-[20rem] max-w-[75vw] md:max-w-[30vw] bg-white dark:bg-black flex flex-col justify-between fixed ${side == "Left" ? "left-0" : "right-0"}  h-full shadow-xl overflow-y-auto z-50 top-0`}
        initial={{ x: side == "Left" ? '-150%' : '150%' }} 
        animate={{ x: shown ? side == "Left" ? '-50%' : '50%' : side == "Left" ? '-150%' : '150%' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      />
      <motion.div
        className={`min-w-[20rem] max-w-[75vw] md:max-w-[30vw] bg-white dark:bg-black text-black dark:text-white flex flex-col fixed ${side == "Left" ? "left-0" : "right-0"} h-full shadow-xl overflow-y-auto z-50 top-0`}
        initial={{ x: side == "Left" ? '-100%' : '100%' }} 
        animate={{ x: shown ? 0 : side == "Left" ? '-100%' : '100%' }} 
        transition={{ type: 'spring', stiffness: 50 }} 
      >
        <header className="flex p-4 justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={icon} size="lg" />
              <div>
                <h1 className="text-xl">{title}</h1>
                <p className="text-xs text-default-600">{description}</p>
              </div>
            </div>
            
          </div>

          <Button size="sm" isIconOnly onClick={() => {
            setSidebarShown(false)
            if (uiClickSound) {
              African3Sound()
            }
          }} variant="solid" className="ml-4">
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </header>
        <Divider />
        {children}
      </motion.div>
    </div>
  );
};
