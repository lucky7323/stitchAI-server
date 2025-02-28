export const ensureNonNegativeBigInt = (input: bigint) => {
  return input < 0n ? 0n : input;
};
