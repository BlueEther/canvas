import { faFire } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const InfoWelcome = () => {
  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center gap-1">
        <FontAwesomeIcon icon={faFire} size="2xs" className="pt-0.5" />
        <h2 className="text">Welcome</h2>
      </header>
      <section>
        <p className="text-default-600 text-xs ml-3">Welcome to canvas! This is an event that lasts for 72 hours where users can place pixels every so often on a shared canvas. Everyone has access to the same canvas and pixels can be placed in any location to create things on the canvas.</p>
      </section>
    </div>
  )
};