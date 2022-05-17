#!/usr/bin/env node

const crypto = require('crypto');
const fs = require("fs");
const {execSimple} = require("./utils");

if (process.platform !== 'darwin') {
    throw new Error('This script only works on macOS');
}

/**
 *
 * @returns {Promise<string>}
 */
async function getChromePassword() {
    return await execSimple("security find-generic-password -w -s \"Chrome Safe Storage\"");
}

async function getCookie(name, domain) {
    throw new Error('Not implemented');
}

/**
 *
 * @param name
 * @param domain
 * @returns {Promise<Buffer>}
 */
async function getFirefoxCookie({name, domain}) {
    if (name && typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (domain && typeof domain !== 'string') {
        throw new Error('domain must be a string');
    }
    const [file] = await findAllFiles({
        path: `${process.env.HOME}/Library/Application Support/Firefox/Profiles`,
        name: "cookies.sqlite"
    })
    if (file && !fs.existsSync(file)) {
        throw new Error(`File ${file} does not exist`);
    }
    if (process.env.VERBOSE) {
        console.log(`Trying Firefox cookie ${name} for domain ${domain}`);
    }
    let sql;
    sql = "SELECT value FROM moz_cookies";
    if (typeof name === 'string' || typeof domain === 'string') {
        sql += ` WHERE `;
        if (typeof name === 'string') {
            sql += `name = '${name}'`;
            if (typeof domain === 'string') {
                sql += ` AND `;
            }
        }
        if (typeof domain === 'string') {
            sql += `host LIKE '${domain}';`;
        }
    }
    return await doSqliteQuery1(file, sql);
}

const defaultChromeRoot = `${process.env.HOME}/Library/Application Support/Google/Chrome`;
const defaultChromeCookies = `${defaultChromeRoot}/Default/Cookies`;

async function getEncryptedChromeCookie({name, domain, file = defaultChromeCookies}) {
    if (name && typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (domain && typeof domain !== 'string') {
        throw new Error('domain must be a string');
    }
    if (file && typeof file !== 'string') {
        throw new Error('file must be a string');
    }
    if (!fs.existsSync(file)) {
        throw new Error(`File ${file} does not exist`);
    }
    if (process.env.VERBOSE) {
        console.log(`Trying Chrome (at ${file}) cookie ${name} for domain ${domain}`);
    }
    let sql;
    sql = `SELECT encrypted_value FROM cookies`;
    if (typeof name === 'string' || typeof domain === 'string') {
        sql += ` WHERE `;
        if (typeof name === 'string') {
            sql += `name = '${name}'`;
            if (typeof domain === 'string') {
                sql += ` AND `;
            }
        }
        if (typeof domain === 'string') {
            sql += `host_key LIKE '${domain}';`;
        }
    }
    return await doSqliteQuery1(file, sql);
}

async function doSqliteQuery1(file, sql) {
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(file);
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const rows1 = rows;
            if (rows1.length === 0) {
                if (process.env.VERBOSE) {
                    console.log(`No rows found`);
                }
                resolve(null);
                return;
            }
            if (Array.isArray(rows1)) {
                // noinspection JSCheckFunctionSignatures
                const [value] = rows1.flatMap(row => Object.values(row));
                resolve(Buffer.from(value));
                return;
            }
            resolve(rows1);
        });
    });
}

/**
 *
 * @param {string} password
 * @param encryptedData
 * @returns {Promise<string>}
 */
async function decrypt(password, encryptedData) {
    if (typeof password !== 'string') {
        throw new Error('password must be a string: ' + password);
    }
    const encryptedData1 = encryptedData;
    if (encryptedData1 == null || typeof encryptedData1 !== 'object') {
        throw new Error('encryptedData must be a object: ' + encryptedData1);
    }
    if (process.env.VERBOSE) {
        console.log(`Trying to decrypt with password ${password}`);
    }
    return await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, 'saltysalt', 1003, 16, 'sha1', (error, buffer) => {
            try {
                if (error) {
                    if (process.env.VERBOSE) {
                        console.log("Error doing pbkdf2", error);
                    }
                    reject(error);
                    return;
                }

                if (buffer.length !== 16) {
                    if (process.env.VERBOSE) {
                        console.log("Error doing pbkdf2, buffer length is not 16", buffer.length);
                    }
                    reject(new Error('Buffer length is not 16'));
                    return;
                }

                const iv = new Buffer.from(new Array(17).join(' '), 'binary');
                const decipher = crypto.createDecipheriv('aes-128-cbc', buffer, iv);
                decipher.setAutoPadding(false);

                if (encryptedData1 && encryptedData1.slice) {
                    encryptedData = encryptedData1.slice(3);
                }

                // if (encryptedData1.length % 16 !== 0) {
                //     if (process.env.VERBOSE) {
                //         console.log("Error doing pbkdf2, encryptedData length is not a multiple of 16", encryptedData1.length);
                //     }
                //     reject(new Error('encryptedData length is not a multiple of 16'));
                //     return;
                // }

                let decoded = decipher.update(encryptedData1, 'binary', 'utf8');
                // let decoded = decipher.update(encryptedData);
                try {
                    decipher.final('utf-8');
                } catch (e) {
                    if (process.env.VERBOSE) {
                        console.log("Error doing decipher.final()", e);
                    }
                    reject(e);
                    return;
                }

                let padding = decoded[decoded.length - 1];
                if (padding) {
                    decoded = decoded.slice(0, 0 - padding);
                }
                // noinspection JSCheckFunctionSignatures
                decoded = decoded.toString('utf8');
                resolve(decoded);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 *
 * @param {string|undefined} name
 * @param {string} domain
 * @returns {Promise<string>}
 */
async function getChromeCookie({name, domain = '%'}) {
    if (name && typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (typeof domain !== 'string') {
        throw new Error('domain must be a string');
    }
    const chromePasswordPromise = getChromePassword();
    const encryptedDataItems = await findAllFiles({
        path: defaultChromeRoot,
        name: 'Cookies'
    }).then(files => {
        const promises = files.map(file => {
            return getEncryptedChromeCookie({
                name: name,
                domain: domain,
                file: file
            }).catch(e => {
                if (process.env.VERBOSE) {
                    console.log("Error getting encrypted cookie", e);
                }
                return null;
            });
        });
        const promise = Promise.all(promises).then(results => {
            return results.filter(result => {
                return result;
            });
        });
        if (process.env.VERBOSE) {
            console.log('promise', promise);
        }
        return promise;
    }).catch(error => {
        if (process.env.VERBOSE) {
            console.log('error', error);
        }
        return [];
    });
    const password = await chromePasswordPromise;
    const decrypted = encryptedDataItems.filter(encryptedData => {
        return encryptedData != null && encryptedData.length > 0;
    }).map(async encryptedData => {
        if (process.env.VERBOSE) {
            console.log("Received encrypted", encryptedData);
        }
        let decrypted;
        try {
            decrypted = await decrypt(password, encryptedData);
        } catch (e) {
            if (process.env.VERBOSE) {
                console.log("Error decrypting cookie", e);
            }
            return null;
        }
        if (decrypted) {
            if (process.env.VERBOSE) {
                console.log("Decrypted", decrypted);
            }
            return decrypted;
        }
        return null;
    });
    return await Promise.all(decrypted).then(results => {
        return results.find(result => typeof result === 'string' && result.length > 0);
    });
}

/**
 *
 * @param path
 * @param name
 * @param rootSegments
 * @param maxDepth
 * @returns {Promise<[string]>}
 */
async function findAllFiles({path, name, rootSegments = path.split('/').length, maxDepth = 2}) {
    if (typeof path !== 'string') {
        throw new Error('path must be a string');
    }
    if (typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (process.env.VERBOSE) {
        console.log(`Searching for ${name} in ${path}`);
    }
    const files = [];
    let readdirSync;
    try {
        readdirSync = fs.readdirSync(path);
    } catch (e) {
        if (process.env.VERBOSE) {
            console.log(`Error reading ${path}`, e);
        }
        return files;
    }
    for (const file of readdirSync) {
        const filePath = path + '/' + file;
        let stat;
        try {
            stat = fs.statSync(filePath);
        } catch (e) {
            if (process.env.VERBOSE) {
                console.error(`Error getting stat for ${filePath}`, e);
            }
            continue;
        }
        if (stat.isDirectory()) {
            if (filePath.split('/').length < rootSegments + maxDepth) {
                try {
                    const subFiles = await findAllFiles({
                        path: filePath,
                        name: name,
                        rootSegments: rootSegments,
                        maxDepth: 2
                    });
                    files.push(...subFiles);
                } catch (e) {
                    if (process.env.VERBOSE) {
                        console.error(e);
                    }
                }
            }
        } else if (file === name) {
            files.push(filePath);
        }
    }
    if (process.env.VERBOSE) {
        if (files.length > 0) {
            console.log(`Found ${(files.length)} ${name} files`);
            console.log(files);
        }
    }
    return files;
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    getDecryptedCookie: getChromeCookie,
    getChromeCookie,
    getFirefoxCookie,
    getCookie
};
