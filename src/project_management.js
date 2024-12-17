// Default requires
const fs = require('node:fs');
const url = require('node:url');
const path = require('path');

// Custom modules
const { getBaseDataObj } = require('./crawler');

// Local constants
const projectsFolder = './projects';
const exportsFolder = `${projectsFolder}/exports`;

const getProjectPredefinedConfigs = (config) => {
    const predefinedConfigs = {
        'small': {
            'pageLimit': 100,
            'crawlingSpeed': 'fast'
        },
        'medium': {
            'pageLimit': 500,
            'crawlingSpeed': 'medium'
        },
        'large': {
            'pageLimit': 0,
            'crawlingSpeed': 'slow'
        }
    }

    return predefinedConfigs[config];
}

const getProjectConfig = (baseUrl) => {
    try {
        const projectName = getProjectName(baseUrl);
        const projectConfigFile = fs.readFileSync(`${projectsFolder}/${projectName}/config.json`, 'utf8');
        return JSON.parse(projectConfigFile);
    } catch (error) {
        return false;
    }
}

const getProjectName = (baseUrl) => {
    try {
        const projectBaseUrl = new URL(baseUrl);
        return projectBaseUrl.hostname.replace('www.', '').replace('.', '-');
    } catch (error) {
        return false;
    }
}

const projectExists = (baseUrl) => {
    const projectConfig = getProjectConfig(baseUrl);

    if (!projectConfig || projectConfig.baseUrl !== baseUrl) {
        return false;
    }

    return true;
}

const createProject = (baseUrl, protocol, pageLimit, crawlingSpeed) => {
    console.log('Base URL: ', baseUrl);
    console.log('Project Protocol: ', protocol);
    console.log('Page Limit: ', pageLimit);
    console.log('Crawling Speed: ', crawlingSpeed);

    const projectConfig = { baseUrl, protocol, pageLimit, crawlingSpeed };
    const projectName = getProjectName(baseUrl);
    const projectBaseData = getBaseDataObj(baseUrl, protocol);

    if (projectExists(baseUrl) || !projectName) {
        return false;
    }

    const newProjectFolder = `${projectsFolder}/${projectName}`;
    const newProjectConfigFile = `${projectsFolder}/${projectName}/config.json`;
    const newProjectDataFile = `${projectsFolder}/${projectName}/data.json`;

    try {
        fs.mkdirSync(newProjectFolder);
        fs.writeFileSync(`${projectsFolder}/${projectName}/config.json`, JSON.stringify(projectConfig), 'utf8');
        fs.writeFileSync(`${projectsFolder}/${projectName}/data.json`, JSON.stringify([projectBaseData]), 'utf8');

        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    projectsFolder,
    exportsFolder,
    projectExists,
    createProject,
    getProjectName,
    getProjectConfig,
    getProjectPredefinedConfigs
}