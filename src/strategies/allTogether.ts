import { executeInSeries, configurable } from "../utils";

/**
 * Execute all Gremlins species at once ; repeat 10ms after for 100 times
 *
 *   const allTogetherStrategy = gremlins.strategies.allTogether();
 *   horde.strategy(allTogetherStrategy);
 *
 * The actual attack duration depends on the number of species in the horde.
 */
type Callback = () => void;
type Params = {
  nb: number;
};
type Config = {
  delay: number;
  nb: number;
};
export function allTogether() {
  const config: Config = {
    delay: 10, // delay in milliseconds between each wave
    nb: 100 // number of waves to execute (can be overridden in params)
  };

  let stopped: boolean;
  let doneCallback: Callback | null | undefined = null;

  /**
   * @mixes config
   */
  function allTogetherStrategy(
    gremlins: Array<() => void>,
    params?: Params,
    done?: Callback
  ) {
    const nb = params && params.nb ? params.nb : config.nb;
    // @ts-ignore
    const horde = this;

    stopped = false;
    doneCallback = done; // done can also be called by stop()

    function executeAllGremlins(callback: Callback) {
      executeInSeries(gremlins, [], horde, callback);
    }

    function executeNextWave(i: number) {
      if (stopped) {
        return;
      }
      if (i >= nb) {
        return callDone();
      }

      executeAllGremlins(() =>
        setTimeout(() => executeNextWave(++i), config.delay)
      );
    }

    executeNextWave(0);
  }

  function callDone() {
    if (typeof doneCallback === "function") {
      doneCallback();
    }
    doneCallback = null;
  }

  allTogetherStrategy.stop = () => {
    stopped = true;
    setTimeout(callDone, 4);
  };

  configurable(allTogetherStrategy, config);

  return allTogetherStrategy;
}
