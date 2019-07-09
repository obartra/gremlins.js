import { configurable } from "../utils";
import { RandomizerRequiredException } from "../exceptions";
/**
 * The formFiller gremlin fills forms by entering data, selecting options, clicking checkboxes, etc
 *
 * As much as possible, the form filling is done using mouse and keyboard
 * events, to trigger any listener bound to it.
 *
 * By default, the formFiller gremlin activity is showed by changing the
 * element border to solid red.
 *
 *   var formFillerGremlin = gremlins.species.formFiller();
 *   horde.gremlin(formFillerGremlin);
 *
 * The formFiller gremlin can be customized as follows:
 *
 *   formFillerGremlin.elementMapTypes({'select': function selectFiller(element) {} }); // form element filler functions
 *   formFillerGremlin.showAction(function(element) { // show the gremlin activity on screen });
 *   formFillerGremlin.canFillElement(function(element) { return true }); // to limit where the gremlin can fill
 *   formFillerGremlin.maxNbTries(5); // How many times the gremlin must look for a fillable element before quitting
 *   formFillerGremlin.logger(loggerObject); // inject a logger
 *   formFillerGremlin.randomizer(randomizerObject); // inject a randomizer
 */
function defaultCanFillElement() {
  return true;
}

function defaultShowAction(element: any) {
  if (typeof element.attributes["data-old-border"] === "undefined") {
    element.attributes["data-old-border"] = element.style.border;
  }

  const oldBorder = element.attributes["data-old-border"];
  element.style.border = "1px solid red";

  setTimeout(function() {
    element.style.border = oldBorder;
  }, 500);
}

function matchesSelector(el: Element, selector: string): boolean {
  return el.matches(selector);
}

type Config = {
  elementMapTypes: {
    [inputType: string]: (element: any) => string | void;
  };
  showAction: (element: any) => void;
  canFillElement: (element: Element) => boolean;
  logger: typeof console;
  maxNbTries: number;
  randomizer: Chance.Chance | null;
};

export function formFiller() {
  const { document } = window;

  const defaultMapElements = {
    textarea: fillTextElement,
    'input[type="text"]': fillTextElement,
    'input[type="password"]': fillTextElement,
    'input[type="number"]': fillNumberElement,
    select: fillSelect,
    'input[type="radio"]': fillRadio,
    'input[type="checkbox"]': fillCheckbox,
    'input[type="email"]': fillEmail,
    "input:not([type])": fillTextElement
  };
  const config: Config = {
    elementMapTypes: defaultMapElements,
    showAction: defaultShowAction,
    canFillElement: defaultCanFillElement,
    maxNbTries: 10,
    logger: console,
    randomizer: null
  };

  function formFillerGremlin() {
    if (!config.randomizer) {
      throw new RandomizerRequiredException();
    }

    // Retrieve all selectors
    var elementTypes = [];

    for (var key in config.elementMapTypes) {
      if (config.elementMapTypes.hasOwnProperty(key)) {
        elementTypes.push(key);
      }
    }

    let element: Element;
    let nbTries: number = 0;

    do {
      // Find a random element within all selectors
      const elements = document.querySelectorAll(elementTypes.join(","));
      if (elements.length === 0) {
        return false;
      }

      element = config.randomizer.pick(Array.from(elements));
      nbTries++;

      if (nbTries > config.maxNbTries) {
        return false;
      }
    } while (!element || !config.canFillElement(element));

    // Retrieve element type
    let elementType;
    for (let selector in config.elementMapTypes) {
      if (matchesSelector(element, selector)) {
        elementType = selector;
        break;
      }
    }

    if (!elementType || !(elementType in config.elementMapTypes)) {
      const selectorsStr = Object.keys(config.elementMapTypes).join(", ");

      throw new Error(`Selectors "${selectorsStr}" did not match`);
    }

    const value = config.elementMapTypes[elementType](element);

    if (typeof config.showAction === "function") {
      config.showAction(element);
    }

    if (config.logger && typeof config.logger.log == "function") {
      config.logger.log("gremlin", "formFiller", "input", value, "in", element);
    }
  }

  function fillTextElement(element: HTMLInputElement): string | void {
    if (config.randomizer === null) {
      return undefined;
    }

    const character = config.randomizer.character();
    element.value += character;

    return character;
  }

  function fillNumberElement(element: HTMLInputElement): string | void {
    if (config.randomizer === null) {
      return undefined;
    }

    const number = config.randomizer.character({ pool: "0123456789" });
    element.value += number;

    return number;
  }

  function fillSelect(element: HTMLSelectElement): string | void {
    const options = element.querySelectorAll("option");
    if (options.length === 0 || config.randomizer === null) {
      return;
    }

    const randomOption = config.randomizer.pick(Array.from(options));

    for (let i = 0, c = options.length; i < c; i++) {
      const option = options[i];
      option.selected = option.value == randomOption.value;
    }

    return randomOption.value;
  }

  function fillRadio(element: HTMLInputElement): string | void {
    // using mouse events to trigger listeners
    const evt = document.createEvent("MouseEvents");

    evt.initMouseEvent(
      "click",
      true,
      true,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );
    element.dispatchEvent(evt);

    return element.value;
  }

  function fillCheckbox(element: HTMLInputElement): string | void {
    // using mouse events to trigger listeners
    const evt = document.createEvent("MouseEvents");

    evt.initMouseEvent(
      "click",
      true,
      true,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );
    element.dispatchEvent(evt);

    return element.value;
  }

  function fillEmail(element: HTMLInputElement): string | void {
    if (config.randomizer === null) {
      return undefined;
    }

    const email = config.randomizer.email();
    element.value = email;

    return email;
  }

  configurable(formFillerGremlin, config);

  return formFillerGremlin;
}
