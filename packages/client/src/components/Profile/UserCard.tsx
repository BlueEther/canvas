import { faMessage, faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Button, Link, Spinner, User } from "@nextui-org/react";
import { ClientConfig } from "@sc07-canvas/lib/src/net";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../contexts/AppContext";

export interface IUser {
  sub: string;
  display_name?: string;
  picture_url?: string;
  profile_url?: string;
  isAdmin: boolean;
  isModerator: boolean;
}

const getMatrixLink = (user: IUser, config: ClientConfig) => {
  return `${config.chat.element_host}/#/user/@${user.sub.replace("@", "=40")}:${config.chat.matrix_homeserver}`;
};

/**
 * Small UserCard that shows profile picture, display name, full username, message box and (currently unused) view profile button
 * @param param0
 * @returns
 */
export const UserCard = ({ user }: { user: IUser }) => {
  const { config, setProfile } = useAppContext();
  const [messageStatus, setMessageStatus] = useState<
    "loading" | "no_account" | "has_account" | "error"
  >("loading");

  useEffect(() => {
    if (!config) {
      console.warn("[UserCard] config is not available yet");
      return;
    }

    setMessageStatus("loading");

    fetch(
      `https://${config.chat.matrix_homeserver}/_matrix/client/v3/profile/${encodeURIComponent(`@${user.sub.replace("@", "=40")}:${config.chat.matrix_homeserver}`)}`
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
  }, [user, config]);

  const handleMatrixClick = (e: MouseEvent) => {
    if (messageStatus === "no_account") {
      e.preventDefault();

      toast.info("This user has not setup chat yet, you cannot message them");
    }
  };

  const openProfile = () => {
    setProfile(user.sub);
  };

  const name = useMemo(() => {
    if (!user || !user.sub) {
      return 'Unknown'
    }

    const regex = /^(.*)@/;
    const match = user.sub.match(regex);

    if (match) {
      return match[1];
    }

    return 'Unknown'
  }, [user])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row space-between p-2">
        <User 
          name={user?.display_name || name}
          description={user?.sub || 'Unknown'}
          avatarProps={{
            showFallback: true,
            name: undefined,
            src: user?.picture_url
          }}
        />
        <div className="ml-auto">
          {config && (
            <Button
              isIconOnly
              as={Link}
              href={getMatrixLink(user, config)}
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
          )}
        </div>
      </div>
      <Button size="sm" onPress={openProfile}>
        View Profile
      </Button>
    </div>
  );
};
