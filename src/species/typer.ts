import { configurable } from "../utils";
import { RandomizerRequiredException } from "../exceptions";

/**
 * The typer gremlin types keys on the keyboard
 *
 * Note that keyboard events must be localized somewhere on screen, so this
 * gremlins picks a random screen location first.
 *
 * By default, the typer gremlin activity is showed by a letter surrounded by
 * a orange circle with a keyname on it.
 *
 *   var typerGremlin = gremlins.species.typer();
 *   horde.gremlin(typerGremlin);
 *
 * The typerGremlin gremlin can be customized as follows:
 *
 *   typerGremlin.eventTypes(['keypress', 'keyup', 'keydown']); // types of events to trigger
 *   typerGremlin.showAction(function(element) { // show the gremlin activity on screen });
 *   typerGremlin.logger(loggerObject); // inject a logger
 *   typerGremlin.randomizer(randomizerObject); // inject a randomizer
 *
 */
function defaultTargetElement(x: number, y: number) {
  const { document } = window;

  return document.elementFromPoint(x, y);
}

function defaultShowAction(
  targetElement: Element,
  x: number,
  y: number,
  key: number
) {
  const { document } = window;
  const { body } = document;

  const typeSignal = document.createElement("div");

  typeSignal.style.zIndex = "2000";
  typeSignal.style.border = "3px solid orange";
  typeSignal.style.borderRadius = "50%";
  typeSignal.style.width = "40px";
  typeSignal.style.height = "40px";
  typeSignal.style.boxSizing = "border-box";
  typeSignal.style.position = "absolute";
  typeSignal.style.transition = "opacity 1s ease-out";
  typeSignal.style.left = x + "px";
  typeSignal.style.top = y + "px";
  typeSignal.style.textAlign = "center";
  typeSignal.style.paddingTop = "7px";
  typeSignal.innerHTML = String.fromCharCode(key);

  const element = body.appendChild(typeSignal);
  setTimeout(() => body.removeChild(element), 1000);
  setTimeout(() => (element.style.opacity = "0"), 50);
}

type Config = {
  eventTypes: string[];
  showAction: (
    targetElement: Element,
    x: number,
    y: number,
    key: number
  ) => void;
  keyGenerator: () => number;
  targetElement: (x: number, y: number) => Element | null;
  logger: typeof console;
  randomizer: Chance.Chance | null;
};

export function typer() {
  const { document } = window;
  const { documentElement } = document;

  const defaultEventTypes = ["keypress", "keyup", "keydown"];

  function defaultKeyGenerator() {
    if (config.randomizer === null) {
      return 3;
    }

    return config.randomizer.natural({ min: 3, max: 254 });
  }

  const config: Config = {
    eventTypes: defaultEventTypes,
    showAction: defaultShowAction,
    keyGenerator: defaultKeyGenerator,
    targetElement: defaultTargetElement,
    logger: console,
    randomizer: null
  };

  function typerGremlin() {
    if (!config.randomizer) {
      throw new RandomizerRequiredException();
    }

    const keyboardEvent = document.createEvent("Events") as KeyboardEvent;
    const eventType = config.randomizer.pick(config.eventTypes);
    const key = config.keyGenerator();
    const posX = config.randomizer.natural({
      max: documentElement.clientWidth - 1
    });
    const posY = config.randomizer.natural({
      max: documentElement.clientHeight - 1
    });
    const targetElement = config.targetElement(posX, posY);

    if (!targetElement) {
      throw new Error(`No element found at ${posX}x${posY}`);
    }

    keyboardEvent.initEvent(eventType, true, true);

    // @ts-ignore
    keyboardEvent.keyCode = key;
    // @ts-ignore
    keyboardEvent.which = key;
    // @ts-ignore
    keyboardEvent.keyCodeVal = key;

    targetElement.dispatchEvent(keyboardEvent);

    if (typeof config.showAction === "function") {
      config.showAction(targetElement, posX, posY, key);
    }

    if (config.logger && typeof config.logger.log === "function") {
      config.logger.log(
        "gremlin",
        "typer       type",
        String.fromCharCode(key),
        "at",
        posX,
        posY
      );
    }
  }

  configurable(typerGremlin, config);

  return typerGremlin;
}
