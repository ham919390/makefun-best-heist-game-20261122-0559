// A small seeded random number generator (xorshift32): the same seed gives
// the same game, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let s = (seed | 0) || 1;
  return function random() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
