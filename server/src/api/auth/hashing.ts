import { scrypt, randomBytes, timingSafeEqual, scryptSync } from 'crypto';

export const createHash = (input: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex'); // Generate a random salt
    scrypt(input, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`); // Combine salt and hash
    });
  });
};

export const compareHash = (one: string, two: string): boolean => {
  try {
    const [salt, originalHash] = two.split(':');
    const derivedKey = scryptSync(one, salt, 64); // Generate hash with the same salt
    return timingSafeEqual(Buffer.from(originalHash, 'hex'), derivedKey); // Safe comparison
  } catch (e) {
    console.error(e);
    return false;
  }
};
