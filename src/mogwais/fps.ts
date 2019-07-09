import { configurable } from "../utils";
import { LoggerRequiredException } from "../exceptions";

type Config = {
  delay: number;
  levelSelector(fps: number): keyof typeof console;
  logger: typeof console | null;
};

/**
 * The fps mogwai logs the number of frames per seconds (FPS) of the browser
 *
 * The normal (and maximal) FPS rate is 60. It decreases when the browser is
 * busy refreshing the layout, or executing JavaScript.
 *
 * This mogwai logs with the error level once the FPS rate drops below 10.
 *
 *   var fpsMogwai = gremlins.mogwais.fps();
 *   horde.mogwai(fpsMogwai);
 *
 * The fps mogwai can be customized as follows:
 *
 *   fpsMogwai.delay(500); // the interval for FPS measurements
 *   fpsMogwai.levelSelector(function(fps) { // select logging level according to fps value });
 *   fpsMogwai.logger(loggerObject); // inject a logger
 *
 * Example usage:
 *
 *   horde.mogwai(gremlins.mogwais.fps()
 *     .delay(250)
 *     .levelSelector(function(fps) {
 *       if (fps < 5) return 'error';
 *       if (fps < 10) return 'warn';
 *       return 'log';
 *     })
 *   );
 */
function defaultLevelSelector(fps: number): keyof typeof console {
  if (fps < 10) {
    return "error";
  }
  if (fps < 20) {
    return "warn";
  }
  return "log";
}

function measureFPS(config: Config) {
  let lastTime: number;
  function init(time: number) {
    lastTime = time;
    window.requestAnimationFrame(measure);
  }
  function measure(time: number) {
    var fps = time - lastTime < 16 ? 60 : 1000 / (time - lastTime);
    var level = config.levelSelector(fps);
    if (config.logger) {
      config.logger[level]("mogwai ", "fps       ", fps);
    }
  }
  window.requestAnimationFrame(init);
}

export function fps() {
  const config: Config = {
    delay: 500, // how often should the fps be measured
    levelSelector: defaultLevelSelector,
    logger: null
  };

  let initialTime: number = -Infinity; // force initial measure
  let enabled: boolean;

  function loop(time: number) {
    if (time - initialTime > config.delay) {
      measureFPS(config);
      initialTime = time;
    }
    if (!enabled) return;
    window.requestAnimationFrame(loop);
  }

  function fpsMogwai() {
    if (!config.logger) {
      throw new LoggerRequiredException();
    }
    enabled = true;
    window.requestAnimationFrame(loop);
  }

  fpsMogwai.cleanUp = () => {
    enabled = false;
    return fpsMogwai;
  };

  configurable(fpsMogwai, config);

  return fpsMogwai;
}
