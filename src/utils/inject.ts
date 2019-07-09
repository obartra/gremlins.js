type Services<A> = {
  [name: string]: A;
};

type Objects<A> = Array<{
  [name: string]: (param?: A) => boolean;
}>;

export function inject<A>(services: Services<A>, objects: Objects<A>) {
  for (let i = 0, count = objects.length; i < count; i++) {
    for (const name in services) {
      if (typeof objects[i][name] === "function" && !objects[i][name]()) {
        objects[i][name](services[name]);
      }
    }
  }
}
