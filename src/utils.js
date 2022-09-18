// noinspection JSUnusedGlobalSymbols

import { exec } from "child_process";

import fs from "fs";

export async function execSimple(command) {
  if (typeof command !== "string") {
    throw new TypeError("execSimple: command must be a string");
  }
  if (process.env.VERBOSE) {
    console.log(command);
  }
  return new Promise((resolve, reject) => {
    exec(
      command,
      { encoding: "binary", maxBuffer: 5 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(error);
          return;
        }
        if (stdout) {
          resolve(stdout.toString("utf8").trim());
        }
      }
    );
  });
}

export async function execAsBuffer(command) {
  if (typeof command !== "string") {
    throw new TypeError("execAsBuffer: command must be a string");
  }
  if (process.env.VERBOSE) {
    console.log(command);
  }
  return await new Promise((resolve, reject) => {
    exec(
      command,
      { encoding: "binary", maxBuffer: 5 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(error);
          return;
        }
        let stdoutAsBuffer = stdout;
        if (typeof stdoutAsBuffer === "string" && stdoutAsBuffer.length > 0) {
          // noinspection JSCheckFunctionSignatures
          stdoutAsBuffer = Buffer.from(stdoutAsBuffer, "binary").slice(0, -1);
        }
        if (stdoutAsBuffer && stdoutAsBuffer.length > 0) {
          resolve(stdoutAsBuffer);
        }
      }
    );
  });
}

export function toStringValue(r) {
  if (process.env.VERBOSE) {
    console.log("Printing value", r);
  }
  if (r) {
    if (typeof r === "string") {
      return r;
    } else if (r.toString) {
      // noinspection JSCheckFunctionSignatures
      return r.toString("utf8");
    }
  }
}

export function printStringValue(r) {
  if (process.env.VERBOSE) {
    console.log("Printing value", r);
  }
  if (r) {
    if (typeof r === "string") {
      console.log(r);
    } else if (r.toString) {
      // noinspection JSCheckFunctionSignatures
      console.log(r.toString("utf8"));
    }
  }
}

/**
 *
 * @param result
 * @returns {string|null}
 */
export function toStringOrNull(result) {
  if (result == null) {
    return null;
  }
  if (process.env.VERBOSE) {
    console.log("result", result);
  }
  if (typeof result === "string" && result.length > 0) {
    return result;
  }
  if (result.slice && result.toString) {
    // noinspection JSCheckFunctionSignatures
    return result.toString("utf8");
  }
  return null;
}

/**
 *
 * @param {string} file
 * @param {string} sql
 * @returns {Promise<Buffer[]>}
 */
export async function doSqliteQuery1(file, sql) {
  if (typeof sql !== "string") {
    throw new TypeError("doSqliteQuery1: sql must be a string");
  }
  if (typeof file !== "string") {
    throw new TypeError("doSqliteQuery1: file must be a string");
  }
  if (!fs.existsSync(file)) {
    throw new Error(`doSqliteQuery1: file ${file} does not exist`);
  }
  if (process.env.VERBOSE) {
    console.log(`doSqliteQuery1: file ${file}`);
    console.log(`doSqliteQuery1: sql ${sql}`);
  }
  const sqlite3 = require("sqlite3");
  const db = new sqlite3.Database(file);
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        if (process.env.VERBOSE) {
          console.log(`doSqliteQuery1: error ${err}`);
        }
        reject(err);
        return;
      }
      const rows1 = rows;
      if (rows1 == null || rows1.length === 0) {
        if (process.env.VERBOSE) {
          console.log(`doSqliteQuery1: no rows`);
        }
        resolve([]);
        return;
      }
      if (Array.isArray(rows1)) {
        if (process.env.VERBOSE) {
          console.log(`doSqliteQuery1: ${rows1.length} rows`);
        }
        // noinspection JSCheckFunctionSignatures
        const buffers = rows1
          .flatMap((row) => Object.values(row))
          .map((v) => Buffer.from(v, "binary"));
        if (process.env.VERBOSE) {
          console.log(`doSqliteQuery1: ${buffers.length} buffers`);
        }
        resolve(buffers);
        return;
      }
      if (process.env.VERBOSE) {
        console.log(`doSqliteQuery1: rows ${JSON.stringify(rows1)}`);
      }
      resolve([rows1]);
    });
  });
}

export function goodString(input) {
  return input && typeof input !== "string";
}
