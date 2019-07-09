export class LoggerRequiredException extends Error {
  message =
    "This mogwai requires a logger to run. Please call logger(loggerObject) before executing the mogwai";

  toString() {
    return this.message;
  }
}
