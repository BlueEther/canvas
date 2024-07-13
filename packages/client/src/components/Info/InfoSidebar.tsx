import { Button, Link } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { Rules } from "./Rules";
import { Privacy } from "./Privacy";

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
    <div
      className="sidebar sidebar-left md:max-w-[30vw]"
      style={{ ...(infoSidebar ? {} : { display: "none" }) }}
    >
      <header>
        <h1>Information</h1>
        <div className="flex-grow" />
        <Button size="sm" isIconOnly onClick={() => setInfoSidebar(false)}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </header>
      <section>
        <div className="flex gap-1 *:flex-grow">
          <Button
            as={Link}
            href="https://matrix.to/#/#canvas-meta:aftermath.gg?via=matrix.org"
            target="_blank"
          >
            Matrix Space
          </Button>
          <Button
            as={Link}
            href="https://discord.gg/mEUqXZw8kR"
            target="_blank"
          >
            {/* i do not know why faDiscord doesn't match the types, but it does render */}
            <FontAwesomeIcon icon={faDiscord as any} />
            Discord
          </Button>
        </div>
        <Button as={Link} href="https://toast.ooo/c/canvas" target="_blank">
          <div className="flex flex-col text-center">
            <span>Lemmy</span>
            <span className="text-xs">!canvas@toast.ooo</span>
          </div>
        </Button>
        <Button
          as={Link}
          href="https://social.fediverse.events/@canvas"
          target="_blank"
        >
          <div className="flex flex-col text-center">
            <span>Mastodon</span>
            <span className="text-xs">@canvas@fediverse.events</span>
          </div>
        </Button>
        <b>Build {__COMMIT_HASH__}</b>
        <div id="grecaptcha-badge"></div>
      </section>

      <Rules />
      <Privacy />
    </div>
  );
};
