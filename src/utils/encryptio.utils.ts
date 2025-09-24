import CryptoJs from "crypto-js";

export const encrypt = ({ plainText }: { plainText: string }): string => {
  return CryptoJs.AES.encrypt(
    plainText,
    process.env.ENCRYPTION_KEY!
  ).toString();
};

export const decrypt = ({ cipherText }: { cipherText: string }): string => {
  const bytes = CryptoJs.AES.decrypt(cipherText, process.env.ENCRYPTION_KEY!);
  return bytes.toString(CryptoJs.enc.Utf8);
};
