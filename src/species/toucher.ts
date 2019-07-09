import { configurable } from "../utils";
import { RandomizerRequiredException } from "../exceptions";

/**
 * The toucher gremlin touches anywhere on the visible area of the document.
 *
 * The toucher gremlin triggers touch events (touchstart, touchmove, touchcancel
 * and touchend), by doing gestures on random targets displayed on the viewport.
 * Touch gestures can last several seconds, so this gremlin isn't instantaneous.
 *
 * By default, the touch gremlin activity is showed by a red disc.
 *
 *   var toucherGremlin = gremlins.species.toucher();
 *   horde.gremlin(toucherGremlin);
 *
 * The toucher gremlin can be customized as follows:
 *
 *   toucherGremlin.touchTypes(['tap', 'gesture']); // the mouse event types to trigger
 *   toucherGremlin.positionSelector(function() { // find a random pair of coordinates to touch });
 *   toucherGremlin.showAction(function(x, y) { // show the gremlin activity on screen });
 *   toucherGremlin.canTouch(function(element) { return true }); // to limit where the gremlin can touch
 *   toucherGremlin.maxNbTries(5); // How many times the gremlin must look for a touchable element before quitting
 *   toucherGremlin.logger(loggerObject); // inject a logger
 *   toucherGremlin.randomizer(randomizerObject); // inject a randomizer
 *
 * Example usage:
 *
 *   horde.gremlin(gremlins.species.toucher()
 *     .touchTypes(['gesture'])
 *     .positionSelector(function() {
 *        // only touch inside the foo element area
 *        var $el = $('#foo');
 *        var offset = $el.offset();
 *        return [
 *          parseInt(Math.random() * $el.outerWidth() + offset.left),
 *          parseInt(Math.random() * $el.outerHeight() + offset.top)
 *        ];
 *     })
 *     . showAction(function(x, y) {
 *       // do nothing (hide the gremlin action on screen)
 *     })
 *   );
 */
function defaultShowAction(touches: Touch[]) {
  const { document } = window;
  const { body } = document;

  const fragment = document.createDocumentFragment();

  touches.forEach(touch => {
    const touchSignal = document.createElement("div");

    touchSignal.style.zIndex = "2000";
    touchSignal.style.background = "red";
    touchSignal.style.borderRadius = "50%";
    touchSignal.style.width = "20px";
    touchSignal.style.height = "20px";
    touchSignal.style.position = "absolute";
    touchSignal.style.transition = "opacity .5s ease-out";
    touchSignal.style.left = touch.x - 10 + "px";
    touchSignal.style.top = touch.y - 10 + "px";

    const element = fragment.appendChild(touchSignal);

    setTimeout(() => body.removeChild(element), 500);
    setTimeout(() => (element.style.opacity = "0"), 50);
  });

  document.body.appendChild(fragment);
}

function defaultCanTouch() {
  return true;
}

/**
 * generate a list of x/y around the center
 */
function getTouches(
  [cx, cy]: [number, number],
  points: number,
  radius: number = 100,
  maybeDegrees?: number | null
) {
  const touches = [];

  // just one touch, at the center
  if (points === 1) {
    return [{ x: cx, y: cy }];
  }

  const degrees = maybeDegrees ? (maybeDegrees * Math.PI) / 180 : 0;
  const slice = (2 * Math.PI) / points;

  for (let i = 0; i < points; i++) {
    const angle = slice * i + degrees;
    touches.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  return touches;
}

type Touch = { x: number; y: number };
type Gesture = {
  distanceX?: number;
  distanceY?: number;
  duration: number;
  radius?: number;
  rotation?: number | null;
  scale?: number;
};
type Config = {
  touchTypes: string[];
  positionSelector: () => [number, number];
  showAction: (touches: Touch[]) => void;
  canTouch: (element: Element) => boolean;
  logger: typeof console;
  maxNbTries: number;
  maxTouches: number;
  randomizer: Chance.Chance | null;
};
export function toucher() {
  const { document } = window;

  const defaultTouchTypes = [
    ...new Array(3).fill("tap"),
    ...new Array(1).fill("doubletap"),
    ...new Array(3).fill("gesture"),
    ...new Array(2).fill("multitouch")
  ];
  const config: Config = {
    touchTypes: defaultTouchTypes,
    positionSelector: defaultPositionSelector,
    showAction: defaultShowAction,
    canTouch: defaultCanTouch,
    maxNbTries: 10,
    logger: console,
    randomizer: null,
    maxTouches: 2
  };

  function defaultPositionSelector(): [number, number] {
    if (config.randomizer === null) {
      return [0, 0];
    }

    return [
      config.randomizer.natural({
        max: document.documentElement.clientWidth - 1
      }),
      config.randomizer.natural({
        max: document.documentElement.clientHeight - 1
      })
    ];
  }

  /**
   * trigger a touchevent
   * @param touches
   * @param element
   * @param type
   */
  function triggerTouch(
    touches: Touch[],
    element: Element,
    type: "start" | "end" | "move"
  ) {
    const touchlist: Array<{
      pageX: number;
      pageY: number;
      clientX: number;
      clientY: number;
      screenX: number;
      screenY: number;
      target: Element;
      identifier: number;
    }> = [];

    function item(index: number) {
      // @ts-ignore
      return this[index] || {};
    }

    // @ts-ignore
    touchlist.identifiedTouch = item;
    // @ts-ignore
    touchlist.item = item;

    touches.forEach((touch, i) => {
      const x = Math.round(touch.x);
      const y = Math.round(touch.y);

      touchlist.push({
        pageX: x,
        pageY: y,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        target: element,
        identifier: i
      });
    });

    const event = document.createEvent("Event");

    event.initEvent("touch" + type, true, true);
    // @ts-ignore
    event.touches = type == "end" ? [] : touchlist;
    // @ts-ignore
    event.targetTouches = type == "end" ? [] : touchlist;
    // @ts-ignore
    event.changedTouches = touchlist;

    element.dispatchEvent(event);
    config.showAction(touches);
  }

  /**
   * trigger a gesture
   */
  function triggerGesture(
    element: Element,
    startPos: [number, number],
    startTouches: Touch[],
    gesture: Gesture,
    done: (touches: Touch[]) => void
  ) {
    const interval = 10;
    const loops = Math.ceil(gesture.duration / interval);
    let loop = 1;

    function gestureLoop() {
      // calculate the radius
      let {
        radius = 0,
        scale = 0,
        distanceX = 0,
        distanceY = 0,
        rotation = null
      } = gesture;

      if (scale !== 1) {
        radius = radius - radius * (1 - scale) * ((1 / loops) * loop);
      }

      // calculate new position/rotation
      const posX = startPos[0] + (distanceX / loops) * loop;
      const posY = startPos[1] + (distanceY / loops) * loop;

      rotation = typeof rotation == "number" ? (rotation / loops) * loop : null;

      const touches = getTouches(
        [posX, posY],
        startTouches.length,
        radius,
        rotation
      );
      const isFirst = loop == 1;
      const isLast = loop == loops;

      if (isFirst) {
        triggerTouch(touches, element, "start");
      } else if (isLast) {
        triggerTouch(touches, element, "end");
        return done(touches);
      } else {
        triggerTouch(touches, element, "move");
      }

      setTimeout(gestureLoop, interval);
      loop++;
    }
    gestureLoop();
  }

  const touchTypes: {
    [touchType: string]: (
      position: [number, number],
      element: Element,
      done: (touches: Touch[], gesture: Gesture) => void
    ) => void;
  } = {
    // tap, like a click event, only 1 touch
    // could also be a slow tap, that could turn out to be a hold
    tap(position, element, done) {
      const touches = getTouches(position, 1);
      const gesture: Gesture = {
        duration: config.randomizer
          ? config.randomizer.integer({ min: 20, max: 700 })
          : 0
      };

      triggerTouch(touches, element, "start");

      setTimeout(() => {
        triggerTouch(touches, element, "end");
        done(touches, gesture);
      }, gesture.duration);
    },

    // doubletap, like a dblclick event, only 1 touch
    // could also be a slow doubletap, that could turn out to be a hold
    doubletap(position, element, done) {
      touchTypes.tap(position, element, () => {
        setTimeout(() => touchTypes.tap(position, element, done), 30);
      });
    },

    // single touch gesture, could be a drag and swipe, with 1 points
    gesture(position, element, done) {
      const gesture: Gesture = {
        distanceX: config.randomizer
          ? config.randomizer.integer({ min: -100, max: 200 })
          : 0,
        distanceY: config.randomizer
          ? config.randomizer.integer({ min: -100, max: 200 })
          : 0,
        duration: config.randomizer
          ? config.randomizer.integer({ min: 20, max: 500 })
          : 0
      };
      const touches = getTouches(position, 1, gesture.radius);

      triggerGesture(element, position, touches, gesture, touches =>
        done(touches, gesture)
      );
    },

    // multitouch gesture, could be a drag, swipe, pinch and rotate, with 2 or more points
    multitouch(position, element, done) {
      const points = config.randomizer
        ? config.randomizer.integer({
            min: 2,
            max: config.maxTouches
          })
        : 0;
      const gesture: Gesture = {
        scale: config.randomizer
          ? config.randomizer.floating({ min: 0, max: 2 })
          : 0,
        rotation: config.randomizer
          ? config.randomizer.natural({ min: -100, max: 100 })
          : 0,
        radius: config.randomizer
          ? config.randomizer.integer({ min: 50, max: 200 })
          : 0,
        distanceX: config.randomizer
          ? config.randomizer.integer({ min: -20, max: 20 })
          : 0,
        distanceY: config.randomizer
          ? config.randomizer.integer({ min: -20, max: 20 })
          : 0,
        duration: config.randomizer
          ? config.randomizer.integer({ min: 100, max: 1500 })
          : 0
      };

      const touches = getTouches(position, points, gesture.radius);

      triggerGesture(element, position, touches, gesture, touches =>
        done(touches, gesture)
      );
    }
  };

  function toucherGremlin(done?: () => void) {
    if (!config.randomizer) {
      throw new RandomizerRequiredException();
    }

    let posX: number;
    let posY: number;
    let targetElement: Element | null;
    let nbTries = 0;

    do {
      [posX, posY] = config.positionSelector();
      targetElement = document.elementFromPoint(posX, posY);
      nbTries++;
      if (nbTries > config.maxNbTries) {
        return;
      }
    } while (!targetElement || !config.canTouch(targetElement));

    const touchType = config.randomizer.pick(config.touchTypes);

    if (!(touchType in touchTypes)) {
      throw new Error(`Invalid touch type "${touchType}"`);
    }

    touchTypes[touchType]([posX, posY], targetElement, logGremlin);

    function logGremlin(touches: Touch[], details: any) {
      if (typeof config.showAction === "function") {
        config.showAction(touches);
      }

      if (config.logger && typeof config.logger.log === "function") {
        config.logger.log(
          "gremlin",
          "toucher   ",
          touchType,
          "at",
          posX,
          posY,
          details
        );
      }
      if (done) {
        done();
      }
    }
  }

  configurable(toucherGremlin, config);

  return toucherGremlin;
}
