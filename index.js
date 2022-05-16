const crypto = require('crypto');
const {exec} = require("child_process");
const fs = require("fs");

if (process.platform !== 'darwin') {
    throw new Error('This script only works on macOS');
}

/**
 *
 * @returns {Promise<string>}
 */
async function getChromePassword() {
    return await new Promise((resolve, reject) => {
        exec("security find-generic-password -w -s \"Chrome Safe Storage\"", (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(error);
                return;
            }
            let s = stdout.toString().trim();
            resolve(s);
        });
    });
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
    return await new Promise((resolve, reject) => {
        const file = `${process.env.HOME}/Library/Application Support/Firefox/Profiles/jk9edb6s.default-release/cookies.sqlite`;
        if (!fs.existsSync(file)) {
            reject(new Error(`File ${file} does not exist`));
            return;
        }
        if (process.env.DEBUG) {
            console.log(`File ${file} exists, trying firefox`);
        }
        let sql;
        sql = `SELECT value FROM moz_cookies`;
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
        const command = `sqlite3 "${file}" "${sql}"`;
        if (process.env.DEBUG) {
            console.log(command);
        }
        exec(command, {encoding: 'binary', maxBuffer: 1024}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(error);
                return;
            }
            let stdoutAsBuffer = stdout;
            if (typeof stdoutAsBuffer === 'string' && stdoutAsBuffer.length > 0) {
                // noinspection JSCheckFunctionSignatures
                stdoutAsBuffer = Buffer.from(stdoutAsBuffer, 'binary').slice(0, -1);
            }
            if (stdoutAsBuffer && stdoutAsBuffer.length > 0) {
                resolve(stdoutAsBuffer);
            }
        });
    });
}

async function getEncryptedChromeCookie(name, domain) {
    if (name && typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (domain && typeof domain !== 'string') {
        throw new Error('domain must be a string');
    }
    return await new Promise((resolve, reject) => {
        const file = `${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Cookies`;
        if (!fs.existsSync(file)) {
            reject(new Error(`File ${file} does not exist`));
            return;
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
        const command = `sqlite3 "${file}" "${sql}"`;
        if (process.env.DEBUG) {
            console.log(command);
        }
        exec(command, {encoding: 'binary', maxBuffer: 1024}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(error);
                return;
            }
            let stdoutAsBuffer = stdout;
            if (typeof stdoutAsBuffer === 'string' && stdoutAsBuffer.length > 0) {
                // noinspection JSCheckFunctionSignatures
                stdoutAsBuffer = Buffer.from(stdoutAsBuffer, 'binary').slice(0, -1);
            }
            if (stdoutAsBuffer && stdoutAsBuffer.length > 0) {
                resolve(stdoutAsBuffer);
            }
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
        throw new Error('password must be a string');
    }
    if (typeof encryptedData !== 'object') {
        throw new Error('encryptedData must be a object');
    }
    return await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, 'saltysalt', 1003, 16, 'sha1', (error, buffer) => {
            const iv = new Buffer.from(new Array(17).join(' '), 'binary');
            const decipher = crypto.createDecipheriv('aes-128-cbc', buffer, iv);
            decipher.setAutoPadding(false);
            encryptedData = encryptedData.slice(3);

            let decoded = decipher.update(encryptedData);
            decipher.final('utf-8');

            let padding = decoded[decoded.length - 1];
            if (padding) {
                decoded = decoded.slice(0, decoded.length - padding);
            }
            decoded = decoded.toString('utf8');
            resolve(decoded)
        });
    });
}

/**
 *
 * @param {string|undefined} name
 * @param {string|undefined} domain
 * @returns {Promise<string>}
 */
async function getChromeCookie({name, domain}) {
    if (name && typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    if (domain && typeof domain !== 'string') {
        throw new Error('domain must be a string');
    }
    const password = await getChromePassword();
    const encryptedData = await getEncryptedChromeCookie(name, domain);
    console.log(encryptedData);
    return await decrypt(password, encryptedData);
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    getDecryptedCookie: getChromeCookie,
    getChromeCookie
};

if (process.argv) {
    if (process.argv.length > 2) {
        const name = process.argv[2];
        const domain = process.argv[3];

        if (process.argv.includes('--debug')) {
            process.env.DEBUG = "true";
        }
        if (process.argv.includes('--verbose')) {
            process.env.VERBOSE = "true";
        }
        if (process.argv.includes("--chrome-only")) {
            process.env.CHROME_ONLY = "true";
        }
        if (process.argv.includes("--firefox-only")) {
            process.env.FIREFOX_ONLY = "true";
        }
        if (process.argv.includes("--ignore-expired")) {
            process.env.IGNORE_EXPIRED = "true";
        }

        if (process.env.CHROME_ONLY) {
            getChromeCookie({name, domain})
                .then(console.log)
                .catch(console.error);
        } else if (process.env.FIREFOX_ONLY) {
            getFirefoxCookie({name, domain})
                .then(console.log)
                .catch(console.error);
        } else {
            getChromeCookie({name, domain})
                .then(r => {
                    if (typeof r === 'string') {
                        console.log(r);
                    } else {
                        return getFirefoxCookie({name, domain}).catch(console.error);
                    }
                })
                .catch((e) => {
                    if (process.env.VERBOSE) {
                        console.error(e);
                    }
                    return getFirefoxCookie({name, domain}).catch(console.error);
                })
                .then(r => {
                    if (typeof r === 'string') {
                        console.log(r);
                    }
                });
        }
    }
}
