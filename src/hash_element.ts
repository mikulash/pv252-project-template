import { FASTElement, html, observable, when } from "@microsoft/fast-element";
import { HashWorkerInputMessage, HashWorkerOutputMessage } from "./hash_worker_messages.js";

/**
 * The purpose of `HashElement` is to compute the SHA256 checksum of the given file, using the
 * implementation provided in `sha-256.js`. It will display progress, elapsed time, and the
 * final hash once computed.
 */

export class HashElement extends FASTElement {
  // Start time to compute elapsed time
  #started: Date;
  // Worker instance
  #worker: Worker;

  /*
        Note that all of these are observable properties and not attributes, 
        because these are not intended to be "parameters" of the element, but
        rather something that the element is updating internally.
    */

  // The name of the file that is being processed.
  @observable
  fileName: string = "";

  // The (approximate) total size of the file.
  @observable
  total: number = -1;

  // The (approximate) size of the remaining unprocessed data.
  @observable
  remaining: number = -1;

  // The final SHA256 hash, once computed.
  @observable
  hash: string | null = null;

  // The time (in ms) elapsed while computing the file hash.
  @observable
  elapsed: number = 0;

  constructor(file: File) {
    super();
    this.#started = new Date();
    this.fileName = file.name;
    this.total = file.size;

    this.#worker = new Worker(new URL("./hash_worker.ts", import.meta.url));

    // messages from the worker
    this.#worker.onmessage = (e: MessageEvent<HashWorkerOutputMessage>) => {
      const message = e.data;
      if (message.type === "progress") {
        this.remaining = message.remaining;
        this.elapsed = new Date().getTime() - this.#started.getTime();
      } else if (message.type === "result") {
        this.hash = message.hash;
        this.remaining = 0;
        this.elapsed = new Date().getTime() - this.#started.getTime();
        // Terminate the worker after completion
        this.#worker.terminate();
      }
    };

    // Send the file to the worker
    const inputMessage: HashWorkerInputMessage = { file };
    this.#worker.postMessage(inputMessage);
  }
}

const hashElementTemplate = html<HashElement>`
  <div style="margin-top: 12px;">
    <b>File name:</b> ${(x) => x.fileName}<br />
    ${when(
      (x) => x.hash !== null,
      html<HashElement>`<b>Hash:</b> ${(x) => x.hash}<br />`,
      html<HashElement>`
        <progress
          max="${(x) => x.total}"
          value="${(x) => x.total - x.remaining}"
          style="margin-right: 12px;"
        ></progress>
        ${when(
          (x) => x.total > 0,
          html<HashElement>`
            <code>
              ${(x) => Math.ceil((x.total - x.remaining) / 1024 / 1024)} MiB /
              ${(x) => Math.ceil(x.total / 1024 / 1024)} MiB
            </code>
            <br />
          `,
          html<HashElement>` Pending...<br /> `
        )}
      `
    )}
    <b>Elapsed:</b> <code>${(x) => Math.floor(x.elapsed / 100) / 10} s</code>
  </div>
`;

HashElement.define({
  name: "hash-element",
  template: hashElementTemplate,
});
