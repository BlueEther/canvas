import { useEffect, useRef, useState } from "react";

const Chat = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={ref} style={{ position: "fixed", top: 0, left: 0, zIndex: 999 }}>
      chat
    </div>
  );
};

export default Chat;
