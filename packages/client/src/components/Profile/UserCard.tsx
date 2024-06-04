import { faMessage, faWarning, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Link, Spinner } from "@nextui-org/react";
import { MouseEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface IUser {
  sub: string;
  display_name?: string;
  picture_url?: string;
  profile_url?: string;
  isAdmin: boolean;
  isModerator: boolean;
}

const MATRIX_HOST = import.meta.env.VITE_MATRIX_HOST!; // eg aftermath.gg
const ELEMENT_HOST = import.meta.env.VITE_ELEMENT_HOST!; // eg https://chat.fediverse.events

const getMatrixLink = (user: IUser) => {
  return `${ELEMENT_HOST}/#/user/@${user.sub.replace("@", "=40")}:${MATRIX_HOST}`;
};

/**
 * Small UserCard that shows profile picture, display name, full username, message box and (currently unused) view profile button
 * @param param0
 * @returns
 */
export const UserCard = ({ user }: { user: IUser }) => {
  const [messageStatus, setMessageStatus] = useState<
    "loading" | "no_account" | "has_account" | "error"
  >("loading");

  useEffect(() => {
    setMessageStatus("loading");

    fetch(
      `https://${MATRIX_HOST}/_matrix/client/v3/profile/${encodeURIComponent(`@${user.sub.replace("@", "=40")}:${MATRIX_HOST}`)}`
    )
      .then((req) => {
        if (req.status === 200) {
          setMessageStatus("has_account");
        } else {
          setMessageStatus("no_account");
        }
      })
      .catch((e) => {
        console.error(
          "Error while getting Matrix account details for " + user.sub,
          e
        );
        setMessageStatus("error");
        toast.error(
          "Error while getting Matrix account details for " + user.sub
        );
      });
  }, [user]);

  const handleMatrixClick = (e: MouseEvent) => {
    if (messageStatus === "no_account") {
      e.preventDefault();

      toast.info("This user has not setup chat yet, you cannot message them");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row gap-2">
        <img
          src={user?.picture_url}
          alt={`${user?.sub}'s profile`}
          className="w-12 h-12"
        />
        <div className="flex flex-col gap-0.25 grow">
          <span>{user?.display_name}</span>
          <span className="text-sm">{user?.sub}</span>
        </div>
        <div>
          <Button
            isIconOnly
            as={Link}
            href={getMatrixLink(user)}
            target="_blank"
            onClick={handleMatrixClick}
          >
            {messageStatus === "loading" ? (
              <Spinner />
            ) : (
              <FontAwesomeIcon
                icon={messageStatus === "error" ? faWarning : faMessage}
                color="inherit"
              />
            )}
          </Button>
        </div>
      </div>
      <Button size="sm">View Profile</Button>
    </div>
  );
};
