/**
 * Execute a list of functions one after the other.
 *
 * Functions can be asynchronous or asynchronous, they will always be
 * executed in the order of the list.
 *
 * @param {Function[]} callbacks - The functions to execute
 * @param {Array} args - The arguments passed to each function
 * @param {Object|null} context - The object the functions must be bound to
 * @param {Function} done - The final callback to execute once all functions are executed
 */
type Callback = (...args: any[]) => void;

export function executeInSeries(
  callbacks: Callback[],
  args: any[],
  context: any,
  done: () => any
) {
  const { length } = args;
  const callbacksCopy = [...callbacks]; // clone the array to avoid modifying the original

  function iterator(itCallbacks: Callback[], subArgs: any[]) {
    if (!itCallbacks.length) {
      return typeof done === "function" ? done() : true;
    }

    const callback = itCallbacks.shift();

    if (!callback) {
      throw new Error("Callback not found");
    }

    callback.apply(context, subArgs);

    // Is the callback synchronous ?
    if (callback.length === length) {
      iterator(itCallbacks, subArgs);
    }
  }

  args.push(() => iterator(callbacksCopy, args));

  iterator(callbacksCopy, args);
}
