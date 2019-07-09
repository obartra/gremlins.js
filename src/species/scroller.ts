import { configurable } from "../utils";
import { RandomizerRequiredException } from "../exceptions";
/**
 * The scroller gremlin scrolls the viewport to reveal another part of the document
 *
 *   var scrollerGremlin = gremlins.species.scroller();
 *   horde.gremlin(scrollerGremlin);
 *
 * The scrollerGremlin gremlin can be customized as follows:
 *
 *   scrollerGremlin.positionSelector(function() { // return a random position to scroll to });
 *   scrollerGremlin.showAction(function(element) { // show the gremlin activity on screen });
 *   scrollerGremlin.logger(loggerObject); // inject a logger
 *   scrollerGremlin.randomizer(randomizerObject); // inject a randomizer
 *
 * Example usage:
 *
 *   horde.gremlin(gremlins.species.scroller()
 *     .positionSelector(function() {
 *       // only click in the app
 *       var $list = $('#todoapp');
 *       var offset = $list.offset();
 *       return [
 *         parseInt(Math.random() * $list.outerWidth() + offset.left),
 *         parseInt(Math.random() * ($list.outerHeight() + $('#info').outerHeight()) + offset.top)
 *       ];
 *     })
 *   )
 */

function defaultShowAction(scrollX: number, scrollY: number) {
  const { document } = window;
  const { documentElement, body } = document;

  const scrollSignal = document.createElement("div");

  scrollSignal.style.zIndex = "2000";
  scrollSignal.style.border = "3px solid red";
  scrollSignal.style.width = documentElement.clientWidth - 25 + "px";
  scrollSignal.style.height = documentElement.clientHeight - 25 + "px";
  scrollSignal.style.position = "absolute";
  scrollSignal.style.transition = "opacity 1s ease-out";
  scrollSignal.style.left = scrollX + 10 + "px";
  scrollSignal.style.top = scrollY + 10 + "px";

  const element = body.appendChild(scrollSignal);

  setTimeout(() => {
    body.removeChild(element);
  }, 1000);

  setTimeout(() => {
    element.style.opacity = "0";
  }, 50);
}

type Config = {
  showAction: (scrollX: number, scrollY: number) => void;
  positionSelector: () => [number, number];
  logger: typeof console;
  randomizer: Chance.Chance | null;
};

export function scroller() {
  const { document } = window;
  const { documentElement, body } = document;
  const config: Config = {
    positionSelector: defaultPositionSelector,
    showAction: defaultShowAction,
    logger: console,
    randomizer: null
  };

  function defaultPositionSelector(): [number, number] {
    if (config.randomizer === null) {
      return [0, 0];
    }

    const documentWidth = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      documentElement.scrollWidth,
      documentElement.offsetWidth,
      documentElement.clientWidth
    );
    const documentHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      documentElement.scrollHeight,
      documentElement.offsetHeight,
      documentElement.clientHeight
    );

    return [
      config.randomizer.natural({
        max: documentWidth - documentElement.clientWidth
      }),
      config.randomizer.natural({
        max: documentHeight - documentElement.clientHeight
      })
    ];
  }

  function scrollerGremlin() {
    if (!config.randomizer) {
      throw new RandomizerRequiredException();
    }

    var position = config.positionSelector(),
      scrollX = position[0],
      scrollY = position[1];

    window.scrollTo(scrollX, scrollY);

    if (typeof config.showAction === "function") {
      config.showAction(scrollX, scrollY);
    }

    if (typeof config.logger.log === "function") {
      config.logger.log("gremlin", "scroller  ", "scroll to", scrollX, scrollY);
    }
  }

  configurable(scrollerGremlin, config);

  return scrollerGremlin;
}
