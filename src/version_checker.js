// Default requires
const fs = require('node:fs');
const axios = require('axios');

function convertVersionIntoInt(version) {
    const splitVersion = version.split('.');
    const major = splitVersion[0].padStart(4, '0');
    const minor = splitVersion[1].padStart(4, '0');
    const patch = splitVersion[2].padStart(4, '0');

    return parseInt(`${major}${minor}${patch}`);
}

async function getRemoveVersion() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/giancarlorosa/custom-crawler/refs/heads/main/package.json');
        return response.data.version;
    } catch (error) {
        console.log(error);
        return false;
    }
}

function getLocalVersion() {
    try {
        const localVersion = fs.readFileSync('package.json', 'utf8');
        return JSON.parse(localVersion).version;
    } catch (error) {
        console.log(error)
        return false;
    }
}

function getLastVersionCheck() {
    try {
        return fs.readFileSync('version_checker.json', 'utf8');
    } catch (error) {
        return createVersionCheckerFile();
    }
}

async function timeToRememberUpdate() {
    const lastVersionCheck = await getLastVersionCheck();
    const today = new Date(Date.now());
    const rememberDate = new Date(parseInt(lastVersionCheck));
    const diffTime = Math.abs(rememberDate - today);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return diffDays < 1;
}

async function createVersionCheckerFile() {
    try {
        const nextVersionCheckDate = `${Date.now()}`;
        fs.writeFileSync('version_checker.json', nextVersionCheckDate, 'utf8');
        return nextVersionCheckDate;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function updateVersionCheckerFile(daysToDelay) {
    try {
        if (parseInt(daysToDelay) < 1) {
            return false;
        }

        const nextVersionCheck = Date.now() + daysToDelay * 24 * 60 * 60 * 1000;
        fs.writeFileSync('version_checker.json', String(nextVersionCheck), 'utf8');

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

function removerVersionCheckerFile() {
    try {
        fs.rmSync('version_checker.json', { force: true });
        return true;
    } catch (error) {
        return false;
    }
}

async function hasUpdate() {
    const remoteVersion = await getRemoveVersion();
    const localVersion = getLocalVersion();
    const rememberUpdate = await timeToRememberUpdate();

    return convertVersionIntoInt(remoteVersion) > convertVersionIntoInt(localVersion) && rememberUpdate;
}

module.exports = {
    hasUpdate,
    getRemoveVersion,
    getLocalVersion,
    updateVersionCheckerFile,
    removerVersionCheckerFile
}