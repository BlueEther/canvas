/**
 * Create enum from array of strings
 *
 * @param values
 * @returns
 */
export const createEnum = <T extends string>(values: T[]): { [k in T]: k } => {
  // @ts-ignore
  let ret: { [k in T]: k } = {};

  for (const val of values) {
    ret[val] = val;
  }

  return ret;
};
