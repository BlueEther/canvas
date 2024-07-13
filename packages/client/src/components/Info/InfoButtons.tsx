import { Button, Link } from "@nextui-org/react";
import { SiDiscord, SiLemmy, SiMastodon, SiMatrix } from "@icons-pack/react-simple-icons"

export const InfoButtons = () => {
  return (
    <div className="p-2 flex gap-2 flex-wrap">
      <Button
        as={Link}
        size="sm"
        href="https://matrix.to/#/#canvas-meta:aftermath.gg?via=matrix.org"
        target="_blank"
        variant="ghost"
      >
        <SiMatrix size={18} />
        <p>Matrix</p>
      </Button>
      <Button
        as={Link}
        size="sm"
        href="https://discord.gg/mEUqXZw8kR"
        target="_blank"
        variant="ghost"
      >
        <SiDiscord size={18} />
        <p>Discord</p>
      </Button>
      <Button
        as={Link}
        size="sm"
        href="https://toast.ooo/c/canvas"
        target="_blank"
        variant="ghost"
      >
        <SiLemmy size={18} />
        <p>Lemmy</p>
      </Button>
      <Button
        as={Link}
        size="sm"
        href="https://social.fediverse.events/@canvas"
        target="_blank"
        variant="ghost"
      >
        <SiMastodon size={18} />
        <p>Mastodon</p>
      </Button>
    </div>
  );
};
