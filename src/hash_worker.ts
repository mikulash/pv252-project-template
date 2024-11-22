import { AsyncSha256 } from "./sha-256.js";
import { HashWorkerInputMessage, HashWorkerOutputMessage } from "./hash_worker_messages.js";


const hasher = new AsyncSha256();

self.onmessage = (e: MessageEvent<HashWorkerInputMessage>) => {
  const { file } = e.data;

  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = reader.result as string;
    const base64String = dataUrl.split(",")[1];

    hasher.async_digest(
      base64String,
      (hash) => {
        const resultMessage: HashWorkerOutputMessage = { type: "result", hash };
        self.postMessage(resultMessage);
      },
      (remaining) => {
        const progressMessage: HashWorkerOutputMessage = {
          type: "progress",
          remaining,
        };
        self.postMessage(progressMessage);
      }
    );
  };

  // Read the file as a Base64 encoded
  reader.readAsDataURL(file);

  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const remaining = file.size - event.loaded;
      const progressMessage: HashWorkerOutputMessage = {
        type: "progress",
        remaining,
      };
      self.postMessage(progressMessage);
    }
  };
};