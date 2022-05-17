// noinspection JSUnusedGlobalSymbols

const {exec} = require('child_process');

async function execSimple(command) {
    if (typeof command !== 'string') {
        throw new TypeError('execSimple: command must be a string');
    }
    if (process.env.VERBOSE) {
        console.log(command);
    }
    return await new Promise((resolve, reject) => {
        exec(command, {encoding: 'binary', maxBuffer: 5 * 1024}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(error);
                return;
            }
            if (stdout) {
                resolve(stdout.toString('utf8').trim());
            }
        });
    });
}

async function execAsBuffer(command) {
    if (typeof command !== 'string') {
        throw new TypeError('execAsBuffer: command must be a string');
    }
    if (process.env.VERBOSE) {
        console.log(command);
    }
    return await new Promise((resolve, reject) => {
        exec(command, {encoding: 'binary', maxBuffer: 5 * 1024}, (error, stdout, stderr) => {
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

function printStringValue(r) {
    if (process.env.VERBOSE) {
        console.log("Printing value", r);
    }
    if (r) {
        if (typeof r === 'string') {
            console.log(r);
        } else if (r.toString) {
            // noinspection JSCheckFunctionSignatures
            console.log(r.toString('utf8'));
        }
    }
}

module.exports = {
    execSimple: execSimple,
    execAsBuffer: execAsBuffer,
    printStringValue: printStringValue
};
