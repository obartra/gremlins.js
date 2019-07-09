export class RandomizerRequiredException extends Error {
  message =
    "This gremlin requires a randomizer to run. Please call randomizer(randomizerObject) before executing the gremlin";
  toString() {
    return this.message;
  }
}
