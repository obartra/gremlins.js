import { configurable } from "../utils";
import { LoggerRequiredException } from "../exceptions";
/**
 * The alert mogwai answers calls to alert()
 *
 * The alert mogwai overrides window.alert, window.confirm, and window.prompt
 * to avoid stopping the stress test with blocking JavaScript calls. Instead
 * of displaying a dialog, these methods are simply replaced by a write in the
 * logger.
 *
 *   var alertMogwai = gremlins.mogwais.alert();
 *   horde.mogwai(alertMogwai);
 *
 * The alert mogwai can be customized as follows:
 *
 *   alertMogwai.watchEvents(['alert', 'confirm', 'prompt']); // select the events to catch
 *   alertMogwai.confirmResponse(function() { // what a call to confirm() should return });
 *   alertMogwai.promptResponse(function() { // what a call to prompt() should return });
 *   alertMogwai.logger(loggerObject); // inject a logger
 *   alertMogwai.randomizer(randomizerObject); // inject a randomizer
 *
 * Example usage:
 *
 *   horde.mogwai(gremlins.mogwais.alert()
 *     .watchEvents(['prompt'])
 *     .promptResponse(function() { return 'I typed garbage'; })
 *   );
 */

type Config = {
  watchEvents: string[];
  confirmResponse: () => boolean;
  promptResponse: () => string;
  logger: typeof console;
  randomizer: Chance.Chance | null;
};
export function alert() {
  const defaultWatchEvents = ["alert", "confirm", "prompt"];
  const { alert, confirm, prompt } = window;

  const config: Config = {
    watchEvents: defaultWatchEvents,
    confirmResponse: defaultConfirmResponse,
    promptResponse: defaultPromptResponse,
    logger: console,
    randomizer: null
  };

  function defaultConfirmResponse() {
    // Random OK or cancel
    if (config.randomizer) {
      return config.randomizer.bool();
    }
    return false;
  }

  function defaultPromptResponse() {
    // Return a random string
    if (config.randomizer) {
      return config.randomizer.sentence();
    }
    return "";
  }

  function alertMogwai() {
    if (!config.logger) {
      throw new LoggerRequiredException();
    }

    if (config.watchEvents.includes("alert")) {
      window.alert = function(msg: string) {
        config.logger.warn("mogwai ", "alert     ", msg, "alert");
      };
    }

    if (config.watchEvents.includes("confirm")) {
      window.confirm = function(msg: string) {
        const out = config.confirmResponse();
        config.logger.warn("mogwai ", "alert     ", msg, "confirm");
        return out;
      };
    }

    if (config.watchEvents.includes("prompt")) {
      window.prompt = function(msg: string) {
        const out = config.promptResponse();
        config.logger.warn("mogwai ", "alert     ", msg, "prompt");
        return out;
      };
    }
  }

  alertMogwai.cleanUp = function() {
    window.alert = alert;
    window.confirm = confirm;
    window.prompt = prompt;
    return alertMogwai;
  };

  configurable(alertMogwai, config);

  return alertMogwai;
}
