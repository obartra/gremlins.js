import { Chance } from "chance";

import { inject, executeInSeries } from "./utils";
import { clicker, toucher, formFiller, scroller, typer } from "./species";
import { alert, fps, gizmo } from "./mogwais";
import { allTogether, bySpecies, distribution } from "./strategies";
import {
  CustomGremlin,
  CustomMogwai,
  CustomStrategy,
  CustomCallback
} from "./types";

export const gremlins: {
  species: {
    [key: string]: () => CustomGremlin;
  };
  mogwais: {
    [key: string]: () => CustomMogwai;
  };
  strategies: {
    [key: string]: CustomStrategy;
  };
  createHorde: () => GremlinsHorde;
} = {
  species: {
    clicker,
    toucher,
    formFiller,
    scroller,
    typer
  },
  mogwais: {
    alert,
    fps,
    gizmo
  },
  strategies: {
    allTogether,
    bySpecies,
    distribution
  },
  /**
   * Get a new horde instance
   */
  createHorde: () => new GremlinsHorde()
};

/**
 * gremlins.js 0.1.0 Copyright (c) 2014, marmelab
 * Available via the MIT license.
 * see: http://github.com/marmelab/gremlins.js for details
 */

export class GremlinsHorde {
  _gremlins: Array<CustomGremlin> = [];
  _mogwais: Array<CustomMogwai> = [];
  _strategies: Array<CustomStrategy> = [];
  _beforeCallbacks: Array<CustomCallback> = [];
  _afterCallbacks: Array<CustomCallback> = [];
  _logger: typeof console = console; // logs to console by default
  _randomizer: Chance.Chance = new Chance();

  /**
   * Add a gremlin to the horde.
   *
   * A gremlin is nothing more than a function. Gremlins mess up with the
   * application in order to test its robustness. Once unleashed, the horde
   * executes each gremlin function several times (see unleash()).
   *
   *   horde.gremlin(function() {
   *     // do nasty things to the application
   *   });
   *
   * The gremlins object contains a few gremlin species that you can add:
   *
   *   horde.gremlin(gremlins.species.clicker());
   *
   * A gremlin can be asynchronous if it takes an argument, which means that
   * the horde is paused until the argument is executed.
   *
   *   horde.gremlin(function(done) {
   *     // do nasty things to the application asynchronously
   *     done();
   *   });
   *
   * If the gremlin provides a logger() function, the horde logger object is
   * injected, to allow the gremlin to record activity.
   *
   *
   * If the gremlin provides a randomizer() function, the horde randomizer
   * object is injected, to allow the gremlin to generate random data in a
   * repeatable way.
   *
   * Here is a more sophisticated gremlin function example:
   *
   *   const logger;
   *   function arrayDestroyer() {
   *     Array.prototype.indexOf = function() { return 42; };
   *     if (logger && logger.log) {
   *       logger.log('All arrays are now equal');
   *     }
   *   });
   *   arrayDestroyer.logger = function(loggerObject) {
   *     logger = loggerObject;
   *   };
   *   horde.gremlin(arrayDestroyer);
   *
   * Gremlin functions are executed in the context of the horde, however it
   * is a good practice to avoid using "this" inside gremlin functions to
   * allow standalone gremlin execution, and to ease debugging.
   *
   *   horde.gremlin(function() {
   *     const oldIndexOf = Array.prototype.indexOf;
   *     Array.prototype.indexOf = function() { return 42; };
   *     // "this" is the horde
   *     this.after(function(){
   *       array.prototype.indexOf = oldIndexOf;
   *     });
   *   });
   *
   * If a horde is unleashed without manually adding at least a single
   * gremlin, all the default gremlin species are added (see allGremlins()).
   *
   * @param {Function} gremlin - A callback to be executed to mess up the app
   * @return {GremlinsHorde}
   */
  gremlin(gremlin: CustomGremlin) {
    this._gremlins.push(gremlin);
    return this;
  }

  /**
   * Add all the registered gremlin species to the horde.
   *
   * The gremlin species are available in gremlins.species. You can add your
   * own easily:
   *
   *   gremlins.species.greenMutant = function(logger) { //... };
   *
   * @return {GremlinsHorde}
   */
  allGremlins() {
    for (const gremlinName in gremlins.species) {
      this.gremlin(gremlins.species[gremlinName]());
    }
    return this;
  }

  /**
   * Add a mogwai to the horde.
   *
   * A mogwai is nothing more than a function. Mogwais monitor application
   * activity in order to detect when gremlins do damages. Contrary to
   * gremlins, mogwais should do no harm to the current application.
   *
   *   // this example mogwai monitors javascript alerts
   *   horde.mogwai(function() {
   *     const oldAlert = window.alert;
   *     window.alert = function(message) {
   *       // do stuff
   *       oldAlert(message);
   *     }
   *   });
   *
   * The gremlins object contains a few mogwai species than you can add:
   *
   *   horde.mogwai(gremlins.mogwais.alert());
   *
   * Mogwais are called once before the horde is unleashed. Just like a
   * before() callback, a mogwai can be synchronous or asynchronous.
   *
   * What distinguishes a mogwai function from a simple before() function
   * is that mogwai functions can provide a cleanUp() function to be called
   * once after the gremlins finished their job.
   *
   * When added, if the mogwai provides a logger() function, the horde
   * logger object is injected, to allow the mogwai to record activity.
   *
   * Here is a more sophisticated mogwai function example:
   *
   *   const oldAlert = window.alert;
   *   const logger;
   *   function alert() {
   *     window.alert = function(message) {
   *       oldAlert(message);
   *       if (logger && logger.log) {
   *         logger.log('alert', msg);
   *       }
   *     }
   *   });
   *   alert.cleanUp = function() {
   *     window.alert = oldAlert;
   *   };
   *   alert.logger = function(loggerObject) {
   *     logger = loggerObject;
   *   };
   *   horde.mogwai(alert);
   *
   * The cleanUp() and logger() support for mogwais allow to build
   * sophisticated monitoring features without using "this", and make
   * the mogwais portable and testable.
   *
   * If a horde is unleashed without manually adding at least a single
   * mogwai, all the default mogwai species are added (see allMogwais()).
   *
   * If you want to disable default mogwais, just add an empty function.
   *
   *   horde.mogwai(function() {});
   *
   * @param {Function} mogwai - A callback to be executed when the test starts
   * @return {GremlinsHorde}
   */
  mogwai(mogwai: CustomMogwai) {
    this._mogwais.push(mogwai);
    return this;
  }

  /**
   * Add all the registered mogwai species to the horde.
   *
   * The mogwai species are available in gremlins.mogwais. You can add your
   * own easily:
   *
   *   gremlins.mogwais.gizmo = function() { //... };
   *
   * @return {GremlinsHorde}
   */
  allMogwais() {
    for (const mogwaiName in gremlins.mogwais) {
      this.mogwai(gremlins.mogwais[mogwaiName]());
    }
    return this;
  }

  /**
   * Add an attack strategy to run gremlins.
   *
   * A strategy is an asynchronous function taking the following arguments:
   *  - gremlins: array of gremlin species added to the horde
   *  - params: the parameters passed as first argument of unleash()
   *  - done: a callback to execute once the strategy is finished
   *
   * A strategy function executes registered gremlins in a certain order,
   * a certain number of times.
   *
   *   horde.strategy(function allAtOnceStrategy(gremlins, params, done) {
   *     gremlins.forEach(function(gremlin) {
   *       gremlin.apply(horde);
   *     });
   *     done();
   *   });
   *
   * The gremlins object contains a few strategies than you can add:
   *
   *   horde.strategy(gremlins.strategies.bySpecies());
   *
   * You can add several strategies by calling strategy() more than once.
   * They will be executed in the order they were registered.
   *
   * If a horde is unleashed without manually adding at least a single
   * strategy, all the default strategy (allTogether) is used.
   *
   * @param {Function} strategy - A callback to be executed when the test starts
   * @return {GremlinsHorde}
   */
  strategy(strategy: CustomStrategy) {
    this._strategies.push(strategy);
    return this;
  }

  /**
   * Add a callback to be executed before gremlins are unleashed.
   *
   * Use it to setup the page before the stress test (disable some features,
   * set default data, bootstrap the application, start a profiler).
   *
   *   horde.before(function() {
   *     console.profile('gremlins'); // start the Chrome profiler
   *   });
   *
   * If the callback takes no argument, it is executed synchronously.
   *
   *   horde.before(function() {
   *     // do things synchronously
   *   });
   *
   * If the callback takes an argument, it is executed asynchronously, which
   * means that the horde is paused until the argument is executed.
   *
   *   horde.before(function(done) {
   *     // do things asynchronously
   *     done();
   *   });
   *
   * before() callbacks are executed in the context of the horde.
   *
   *   horde.before(function() {
   *     // "this" is the horde
   *     this.log('Preparing the attack');
   *   });
   *
   * You can add several callbacks by calling before() more than once.
   * They will be executed in the order they were registered.
   *
   * @param {Function} beforeCallback - A callback to be executed before the stress test
   * @return {GremlinsHorde}
   */
  before(beforeCallback: CustomCallback) {
    this._beforeCallbacks.push(beforeCallback);
    return this;
  }

  /**
   * Add a callback to be executed after gremlins finished their job.
   *
   * Use it to collect insights of the gremlins activity, stop a profiler,
   * or re-enable features that were disabled for the test.
   *
   *   horde.after(function() {
   *     console.profileEnd(); // stop the Chrome profiler
   *   });
   *
   * If the callback takes no argument, it is executed synchronously.
   *
   *   horde.after(function() {
   *     // do things synchronously
   *   });
   *
   * If the callback takes an argument, it is executed asynchronously, which
   * means that the horde is paused until the argument is executed.
   *
   *   horde.after(function(done) {
   *     // do things asynchronously
   *     done();
   *   });
   *
   * after() callbacks are executed in the context of the horde.
   *
   *   horde.after(function() {
   *     // "this" is the horde
   *     this.log('Cleaning up the mess after the attack');
   *   });
   *
   * You can add several callbacks by calling after() more than once.
   * They will be executed in the order they were registered.
   *
   * @param {Function} afterCallback - A callback to be executed at the end of the stress test
   * @return {GremlinsHorde}
   */
  after(afterCallback: CustomCallback) {
    this._afterCallbacks.push(afterCallback);
    return this;
  }

  /**
   * Set the logger object to use for logging.
   *
   * When called with no parameter, return the current logger.
   *
   * The logger object must provide 4 functions: log, info, warn, and error.
   *
   *   const consoleLogger = {
   *       log:   console.log.bind(console),
   *       info:  console.info.bind(console),
   *       warn:  console.warn.bind(console),
   *       error: console.error.bind(console)
   *   };
   *   horde.logger(consoleLogger);
   *
   * The logger object is injected to mogwais, and to gremlins.
   *
   * By default, a horde uses the global console object as logger.
   *
   * @param {Object} [logger] - A logger object
   * @return {GremlinsHorde}
   */
  logger(logger?: typeof console) {
    if (!logger) {
      return this._logger;
    }
    this._logger = logger;
    return this;
  }

  /**
   * Shortcut to the logger's log() method.
   *
   * Mostly useful for before() and after() callbacks. Only supports a
   * single argument.
   *
   * @param {String} msg The message to log
   */
  log(msg: string) {
    this._logger.log(msg);
  }

  /**
   * Set the randomizer object to use for generating random data.
   *
   * When called with no parameter, return the current randomizer.
   *
   * The randomizer object must be compatible with chance.js.
   *
   * The randomizer object is injected to mogwais, and to gremlins.
   *
   * By default, a horde uses a new Chance object as logger.
   *
   * @param {Object} [randomizer] - A randomizer object
   * @return {GremlinsHorde}
   */
  randomizer(randomizer?: Chance.Chance) {
    if (!randomizer) {
      return this._randomizer;
    }
    this._randomizer = randomizer;
    return this;
  }

  /**
   * Seed the random number generator
   *
   * Useful to generate repeatable random results actions.
   *
   * You can pass either an integer, or a random data generator callback
   *
   * @see Chance() constructor
   */
  seed(seed: number) {
    this._randomizer = new Chance(seed);
    return this;
  }

  /**
   * Start the stress test by executing gremlins according to the strategies
   *
   * Gremlins and mogwais do nothing until the horde is unleashed.
   * When unleashing, you can pass parameters to the strategies, such as the
   * number of gremlin waves in the default strategy.
   *
   *   horde.unleash({ nb: 50 }); // all gremlins will attack 50 times
   *
   * unleash() executes asynchronously, so you must use the second argument
   * if you need to execute code after the stress test.
   *
   *   horde.unleash({}, function() {
   *     console.log('Phew! Stress test is over.');
   *   });
   *
   * Alternately, you can use the after() method.
   *
   *   horde
   *     .after(function() {
   *       console.log('Phew! Stress test is over.');
   *     })
   *     .unleash();
   *
   * @param {Object} [params] - A list of parameters passed to each strategy.
   * @param {Function} [done] - A callback to be executed once the stress test is over
   */
  unleash(params: object, done: CustomCallback) {
    if (this._gremlins.length === 0) {
      this.allGremlins();
    }
    if (this._mogwais.length === 0) {
      this.allMogwais();
    }
    if (this._strategies.length === 0) {
      // @ts-ignore
      this.strategy(gremlins.strategies.distribution());
    }

    const gremlinsAndMogwais = [...this._gremlins, ...this._mogwais];
    const allCallbacks = [
      ...gremlinsAndMogwais,
      ...this._strategies,
      ...this._beforeCallbacks,
      ...this._afterCallbacks
    ];
    inject(
      { logger: this._logger, randomizer: this._randomizer },
      // @ts-ignore
      allCallbacks
    );
    const beforeCallbacks = [...this._beforeCallbacks, ...this._mogwais];

    const afterCallbacks = this._afterCallbacks;
    for (let i = 0, count = gremlinsAndMogwais.length; i < count; i++) {
      // @ts-ignore
      if (typeof gremlinsAndMogwais[i].cleanUp === "function") {
        // @ts-ignore
        afterCallbacks.push(gremlinsAndMogwais[i].cleanUp);
      }
    }

    const horde = this;

    executeInSeries(beforeCallbacks, [], horde, function() {
      executeInSeries(
        horde._strategies,
        [horde._gremlins, params],
        horde,
        function() {
          executeInSeries(afterCallbacks, [], horde, function() {
            if (typeof done === "function") {
              done();
            }
          });
        }
      );
    });
  }

  /**
   * Stop a running test
   *
   * Delegate the stop message to all registered strategies. Calling
   * this method before starting the test or after it is finished has
   * no effect.
   *
   * stop() will only work properly if strategies implement their own stop()
   * method.
   */
  stop() {
    for (let i = 0, count = this._strategies.length; i < count; i++) {
      // @ts-ignore
      this._strategies[i].stop();
    }
  }
}
