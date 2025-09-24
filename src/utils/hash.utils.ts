import bcrypt from "bcryptjs";

interface HashingOptions {
  plainText?: string;
  saltRounds?: number;
}

interface ComparePasswordsOptions {
  plainText?: string;
  hash?: string;
}

export const hashing = async ({
  plainText = "",
  saltRounds = 12,
}: HashingOptions): Promise<string> => {
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(plainText, salt);
};

export const compare = async ({
  plainText = "",
  hash = "",
}: ComparePasswordsOptions): Promise<boolean> => {
  return await bcrypt.compare(plainText, hash);
};
