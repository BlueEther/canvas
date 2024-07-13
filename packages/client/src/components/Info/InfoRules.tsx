import { faGavel } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const InfoRules = () => {
  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center gap-1">
        <FontAwesomeIcon icon={faGavel} size="2xs" className="pt-0.5" />
        <h2 className="text">Rules</h2>
      </header>
      <section>
        <ol className="list-decimal text-default-800 text-sm ml-10 flex flex-col gap-1">
          <li>
            <p>No alternate accounts</p>
            <p className="text-xs text-default-600">We want to keep it fair and not require people to create more
            accounts to defend their art</p>
          </li>
          <li>
            <p>No bots/automated placements</p>
            <p className="text-xs text-default-600">We're land of the humans, not bots</p>
          </li>
          <li>
            <p>No hate speech or adjacent</p>
          </li>
          <li>
            <p>No gore or nudity (NSFW/NSFL)</p>
          </li>
        </ol>
        <p className="text-default-600 text-xs ml-3 mt-1">
          This canvas is built upon good faith rules, therefore moderators have
          complete discretion on the rules. If you have any questions, ask in
          the Matrix space or the Discord
        </p>
      </section>
    </div>
  )
};