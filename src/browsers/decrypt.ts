import { BinaryLike, createDecipheriv, pbkdf2 } from "crypto";
import { parsedArgs } from "../argv";
import consola from "consola";

// Function to decrypt encrypted data using a password
export async function decrypt(
  password: BinaryLike, // The password to use for decryption
  encryptedData: Buffer // The data to decrypt
): Promise<string> {
  // Returns a promise that resolves with the decrypted string
  // Check if password is a string
  if (typeof password !== "string") {
    throw new Error("password must be a string: " + password);
  }
  let encryptedData1: any;
  encryptedData1 = encryptedData;
  // Check if encryptedData is an object
  if (encryptedData1 == null || typeof encryptedData1 !== "object") {
    throw new Error("encryptedData must be a object: " + encryptedData1);
  }
  // Check if encryptedData is a Buffer or an array of Buffers
  if (!(encryptedData1 instanceof Buffer)) {
    if (Array.isArray(encryptedData1) && encryptedData1[0] instanceof Buffer) {
      [encryptedData1] = encryptedData1;
      // Log if encryptedData is an array of buffers
      if (parsedArgs.verbose) {
        console.log(
          `encryptedData is an array of buffers, selected first: ${encryptedData1}`
        );
      }
    } else {
      throw new Error("encryptedData must be a Buffer: " + encryptedData1);
    }
    encryptedData1 = Buffer.from(encryptedData1);
  }
  // Log the password being used for decryption
  if (parsedArgs.verbose) {
    consola.start(`Trying to decrypt with password: ${password}`);
  }
  // Return a promise that resolves with the decrypted string
  return new Promise((resolve, reject) => {
    // Use pbkdf2 to derive a key from the password
    pbkdf2(password, "saltysalt", 1003, 16, "sha1", (error, buffer) => {
      try {
        // Handle any errors from pbkdf2
        if (error) {
          if (parsedArgs.verbose) {
            console.log("Error doing pbkdf2", error);
          }
          reject(error);
          return;
        }

        // Check if the buffer length is 16
        if (buffer.length !== 16) {
          if (parsedArgs.verbose) {
            console.log(
              "Error doing pbkdf2, buffer length is not 16",
              buffer.length
            );
          }
          reject(new Error("Buffer length is not 16"));
          return;
        }

        // Create an initialization vector
        const str = new Array(17).join(" ");
        const iv = Buffer.from(str, "binary");
        // Create a decipher using the derived key and initialization vector
        const decipher = createDecipheriv("aes-128-cbc", buffer, iv);
        decipher.setAutoPadding(false);

        // Remove the first 3 bytes from the encrypted data
        if (encryptedData1 && encryptedData1.slice) {
          encryptedData1 = encryptedData1.slice(3);
        }

        // Check if the encrypted data length is a multiple of 16
        if (encryptedData1.length % 16 !== 0) {
          if (parsedArgs.verbose) {
            console.log(
              "Error doing pbkdf2, encryptedData length is not a multiple of 16",
              encryptedData1.length
            );
          }
          reject(new Error("encryptedData length is not a multiple of 16"));
          return;
        }

        // Update the decipher with the encrypted data
        let decoded = decipher.update(encryptedData1);
        try {
          // Finalize the decipher
          decipher.final("utf-8");
        } catch (e) {
          if (parsedArgs.verbose) {
            console.log("Error doing decipher.final()", e);
          }
          reject(e);
          return;
        }

        // Remove padding from the decoded data
        const padding = decoded[decoded.length - 1];
        if (padding) {
          decoded = decoded.slice(0, 0 - padding);
        }
        // Convert the decoded data to a string
        const decodedString = decoded.toString("utf8");
        // Resolve the promise with the decrypted string
        resolve(decodedString);
      } catch (e) {
        // Reject the promise if there is an error
        reject(e);
      }
    });
  });
}
