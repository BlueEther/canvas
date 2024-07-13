/**
 * Rules listed inside InfoSidebar
 *
 * TODO: Customize this w/o editing the source #46
 *
 * @returns
 */
export const Rules = () => {
  return (
    <>
      <header>
        <h2>Rules</h2>
      </header>
      <section>
        <p>Welcome to Canvas!</p>
        <p>
          We just have a couple rules, to use the canvas you must agree to them
        </p>
        <ol className="list-decimal ml-5">
          <li>
            <b>No alternative accounts</b>
            <br />
            We want to keep it fair and not require people to create more
            accounts to defend their art
          </li>
          <li>
            <b>No bots/automated placements</b>
            <br />
            We're land of the humans, not bots
          </li>
          <li>
            <b>No hate speech or adjacent</b>
          </li>
          <li>
            <b>No gore or nudity (NSFW/NSFL)</b>
          </li>
        </ol>
        <i>
          This canvas is built upon good faith rules, therefore moderators have
          complete discretion on the rules. If you have any questions, ask in
          the Matrix space or the Discord
        </i>
      </section>
    </>
  );
};
