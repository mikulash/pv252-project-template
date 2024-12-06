import {
  allComponents,
  provideFluentDesignSystem,
} from "@fluentui/web-components";
import { SocketCanvasElement } from "./socket_canvas.js";
// Make everything use microsoft fluent by default.
provideFluentDesignSystem().register(allComponents);

/* 

Useful types (you don't have to use them explicitly, 
they serve as documentation for what the protocol is doing) 

*/

interface Point {
  x: number,
  y: number,
}

interface WelcomeMessage {
  // The size of the remote canvas.
  x: number,
  y: number,
  data: [number]
}

interface UpdateMessage {
  point: Point,
  value: boolean,
}

// Create a websocket connection. 
// More info at https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
const socket = new WebSocket("ws:socket.zavazadlo.unsigned-short.com");
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (isWelcomeMessage(message)) {
    initializeCanvas(message);
  } else if (Array.isArray(message) && message.every(isUpdateMessage)) {
    applyUpdates(message);
  }
};

let canvas: SocketCanvasElement;

function initializeCanvas(message: WelcomeMessage) {
  canvas = new SocketCanvasElement();
  canvas.width = message.x;
  canvas.height = message.y;

  document.querySelector("#container")!.appendChild(canvas);

  setTimeout(() => {
    for (let x = 0; x < message.x; x++) {
      for (let y = 0; y < message.y; y++) {
        const pixelIndex = y + x * message.y;
        const pixelValue = message.data[pixelIndex];
        canvas.setPixel(x, y, !!pixelValue);
      }
    }
  }, 0);

  canvas.ondraw = (x, y) => handleLocalDraw(x, y);
}

function handleLocalDraw(x: number, y: number) {
  const value = !!canvas.context!.getImageData(x, y, 1, 1).data[0];
  canvas.setPixel(x, y, value);

  const update: UpdateMessage = {
    point: { x, y },
    value,
  };

  socket.send(JSON.stringify(update));
}

function applyUpdates(updates: UpdateMessage[]) {
  for (const update of updates) {
    canvas.setPixel(update.point.x, update.point.y, update.value);
  }
}

function isWelcomeMessage(msg: any): msg is WelcomeMessage {
  return msg && typeof msg.x === 'number' && typeof msg.y === 'number' && Array.isArray(msg.data);
}

function isUpdateMessage(msg: any): msg is UpdateMessage {
  return msg && typeof msg.point === 'object' && typeof msg.value === 'boolean';
}


