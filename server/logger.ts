import fs from "node:fs";
import { createLogger } from "vite";

const LOG_FILE_NAME = "riff-vite.log";

enum DevxLogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
}

const appendToLogFile = (text: string): void => {
  fs.appendFileSync(LOG_FILE_NAME, `${new Date().toISOString()}: ${text}\n`);
};

interface UiLogMessage {
  level: DevxLogLevel;
  timestamp: string;
  text: string;
}

const postToTopic = (
  level: DevxLogLevel,
  text: string,
  topic = "ui.log",
): void => {
  fetch(
    `http://localhost:${process.env.DEVX_API_PORT}/workspace/internal/publish/${topic}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        text,
      } satisfies UiLogMessage),
    },
  ).catch((err) => {
    appendToLogFile(`Failed to post to topic ${topic}: ${err}`);
  });
};

const CWD = process.cwd();

// Scope down messages so they don't include full devx paths
const scopeMessage = (msg: string): string => msg.replaceAll(`${CWD}/src/`, "");

// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
const removeColors = (msg: string): string => msg.replace(/\u001b\[.*?m/g, "");

const FILE_LINE_REGEXP = /(\s*file:\s.*:\d*:\d*)$/im;

// Cut the vite log message on file location
// which is usually where it goes from useful to noisy
const cutMessage = (msg: string): string => {
  if (FILE_LINE_REGEXP.test(msg)) {
    const parts = msg.split(FILE_LINE_REGEXP);
    return parts.slice(0, 2).join("");
  }
  return msg;
};

const pipe =
  (...fns: Array<(value: string) => string>) =>
  (x: string) =>
    fns.reduce((v, f) => f(v), x);

const processLogMessage = (msg: string): string =>
  pipe(cutMessage, removeColors, scopeMessage)(msg);

export const createRiffLogger = ({ isLocal }: { isLocal: boolean }) => {
  const logger = createLogger();

  logger.error = (msg, _options) => {
    const result = processLogMessage(msg);

    if (isLocal) {
      console.error(`[ERROR] ${result}`);
    } else {
      postToTopic(DevxLogLevel.ERROR, result);
    }
  };

  logger.warn = (msg, _options) => {
    const result = processLogMessage(msg);

    if (isLocal) {
      console.warn(`[WARN] ${result}`);
    } else {
      postToTopic(DevxLogLevel.WARNING, result);
    }
  };

  logger.info = (msg, _options) => {
    const result = processLogMessage(msg);

    if (isLocal) {
      console.info(`[INFO] ${result}`);
    } else {
      postToTopic(DevxLogLevel.INFO, result);
    }
  };

  logger.warnOnce = (msg, _options) => {
    const result = processLogMessage(msg);

    if (isLocal) {
      console.warn(`[WARN] ${result}`);
    } else {
      postToTopic(DevxLogLevel.WARNING, result);
    }
  };

  return logger;
};
