import "./lib/net";
import Pallete from "./lib/pallete";
import Canvas from "./lib/canvas";

window.addEventListener("mousemove", (e) => {
  const cursor = document.getElementById("cursor");
  cursor!.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`;
});

Canvas.setup();
Canvas.draw();
