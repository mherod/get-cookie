import { createDecipheriv, pbkdf2 } from "crypto";
import { parsedArgs } from "../../argv";
import { logger } from '@/utils/logger';

interface Decryptor {
  decrypt(password: string, encryptedData: Buffer): Promise<string>;
}

class BufferDecryptor implements Decryptor {
  async decrypt(password: string, encryptedData: Buffer): Promise<string> {
    this.validatePassword(password);
    const preparedData: Buffer =
      this.validateAndPrepareEncryptedData(encryptedData);

    if (parsedArgs.verbose) {
      logger.start(`Trying to decrypt with password: ${password}`);
    }

    const decryptedData: string = await this.performDecryption(
      password,
      preparedData,
    );

    if (parsedArgs.verbose) {
      logger.success(`Decryption successful: ${decryptedData}`);
    }

    return decryptedData;
  }

  private validatePassword(password: string): void {
    if (typeof password !== "string") {
      throw new Error("password must be a string: " + password);
    }
  }

  private validateAndPrepareEncryptedData(encryptedData: Buffer): Buffer {
    if (
      encryptedData == null ||
      !(
        encryptedData instanceof Buffer ||
        (Array.isArray(encryptedData) && Buffer.isBuffer(encryptedData[0]))
      )
    ) {
      throw new Error(
        "encryptedData must be a Buffer or an array of Buffers: " +
          encryptedData,
      );
    }

    if (Array.isArray(encryptedData) && Buffer.isBuffer(encryptedData[0])) {
      encryptedData = encryptedData[0];
      if (parsedArgs.verbose) {
        logger.info(
          `encryptedData is an array of buffers, selected first: ${encryptedData}`,
        );
      }
    }

    return Buffer.from(encryptedData);
  }

  private performDecryption(
    password: string,
    encryptedData: Buffer,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.deriveKey(password)
        .then((key) => this.decryptData(key, encryptedData))
        .then((decrypted) => resolve(decrypted))
        .catch((error) => reject(error));
    });
  }

  private deriveKey(password: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      pbkdf2(
        password,
        "saltysalt",
        1003,
        16,
        "sha1",
        (error: Error | null, buffer: Buffer) => {
          if (error) {
            logger.error("Error doing pbkdf2", error);
            reject(error);
            return;
          }

          if (buffer.length !== 16) {
            logger.error(
              "Error doing pbkdf2, buffer length is not 16",
              buffer.length,
            );
            reject(new Error("Buffer length is not 16"));
            return;
          }

          resolve(buffer);
        },
      );
    });
  }

  private decryptData(key: Buffer, encryptedData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const iv: Buffer = Buffer.from(new Array(17).join(" "), "binary");
      const decipher = createDecipheriv("aes-128-cbc", key, iv);
      decipher.setAutoPadding(false);

      const slicedData: Buffer = encryptedData.slice(3);

      if (slicedData.length % 16 !== 0) {
        logger.error(
          "Error, encryptedData length is not a multiple of 16",
          slicedData.length,
        );
        reject(new Error("encryptedData length is not a multiple of 16"));
        return;
      }

      let decoded: Buffer = decipher.update(slicedData);
      try {
        decipher.final("utf-8");
      } catch (e) {
        logger.error("Error doing decipher.final()", e);
        reject(e);
        return;
      }

      const padding: number = decoded[decoded.length - 1];
      if (padding) {
        decoded = decoded.slice(0, 0 - padding);
      }

      resolve(decoded.toString("utf8"));
    });
  }

  private logError(message: string, error: any): void {
    if (parsedArgs.verbose) {
      logger.error(message, error);
    }
  }
}

export const decryptor: Decryptor = new BufferDecryptor();

export async function decrypt(
  password: string,
  encryptedData: Buffer,
): Promise<string> {
  return decryptor.decrypt(password, encryptedData);
}
