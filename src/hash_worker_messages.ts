// If you want to use types (e.g. types of messages) that are used by
// the main website and the web worker, it might be good to have those
// declared in a separate file, so that they can be imported
// from both contexts.
// hash_worker_messages.ts

// from the main thread to the worker
export interface HashWorkerInputMessage {
  file: File;
}

//worker to the main thread
export type HashWorkerOutputMessage =
  | { type: "progress"; remaining: number }
  | { type: "result"; hash: string };
