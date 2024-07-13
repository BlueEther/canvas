import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";

export const InfoPrivacy = () => {
  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center gap-1">
        <FontAwesomeIcon icon={faShieldHalved} size="2xs" className="pt-0.5" />
        <h2 className="text">Privacy</h2>
      </header>
      <section>
        <ul className="list-disc text-default-800 text-sm ml-10 flex flex-col gap-1">
          <li>
            Google Invisible Recaptcha is used to help prevent bots. Google's
            privacy policy and terms are available below.
          </li>
          <li>Usernames should not be assumed to be private</li>
        </ul>
      </section>
    </div>
  );
};
