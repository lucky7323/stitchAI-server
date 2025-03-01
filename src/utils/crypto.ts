export const generateUUID = (): string => {
  const bytes = CryptoJS.lib.WordArray.random(16);
  const hex = bytes.toString(CryptoJS.enc.Hex);

  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(12, 15)}-a${hex.substring(15, 18)}-${hex.substring(18, 22)}`;
};
