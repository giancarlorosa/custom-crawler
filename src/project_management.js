// Default requires
const fs = require('node:fs');
const url = require('node:url');
const path = require('path');

// Custom modules

// Local constants
const projectsFolder = './projects';
const exportsFolder = `${projectsFolder}/exports`;

const getRunningProjectsConfig = () => {
    try {
        const runningProjectsConfig = fs.readFileSync(`${projectsFolder}/config.json`, 'utf8');
        return JSON.parse(runningProjectsConfig);
    } catch (error) {
        return false;
    }
}

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

const getBaseDataObj = (url, protocol) => {
    return {
        'url': url,
        'protocol': protocol,
        'visited': false,
        'statusCode': null,
        'externalLink': false,
        'documentLink': null,
        'absoluteLink': false,
        'pageAnchor': null,
        'links': []
    }
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

const runningProjectExists = (baseUrl) => {
    const runningProjectsConfig = getRunningProjectsConfig();

    if (!runningProjectsConfig) {
        return false;
    }

    return runningProjectsConfig.filter(project => project.baseUrl === baseUrl).length > 0;
}

const setRunningProject = (baseUrl) => {
    const runningProjectsConfig = getRunningProjectsConfig();
    const runningProject = runningProjectExists(baseUrl);
    const runningProjectConfigFile = `${projectsFolder}/config.json`;
    let runningProjectConfigData = [];

    try {
        if (!runningProjectsConfig) {
            fs.mkdirSync(projectsFolder);
            runningProjectConfigData = [{ baseUrl, 'active': true }];
        }

        if (runningProjectsConfig && !runningProject) {
            const inactivatedRunningProjects = runningProjectsConfig.map(project => { return { ...project, active: false } });
            runningProjectConfigData = [...inactivatedRunningProjects, { baseUrl, active: true }];
        }

        if (runningProjectsConfig && runningProject) {
            runningProjectConfigData = runningProjectsConfig.map(project => {
                if (project.baseUrl === baseUrl) {
                    return { ...project, active: true };
                }

                return { ...project, active: false };
            });
        }

        fs.writeFileSync(runningProjectConfigFile, JSON.stringify(runningProjectConfigData), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

const createProject = (baseUrl, protocol, folderRestriction = null, pageLimit = 500, crawlingSpeed = 'fast') => {
    const firstUrlToCrawl = folderRestriction ? baseUrl + folderRestriction : baseUrl
    const projectConfig = { baseUrl, protocol, folderRestriction, pageLimit, crawlingSpeed };
    const projectName = getProjectName(baseUrl);
    const projectBaseData = getBaseDataObj(firstUrlToCrawl, protocol);

    if (projectExists(baseUrl) || !projectName || !setRunningProject(baseUrl)) {
        return false;
    }

    const newProjectFolder = `${projectsFolder}/${projectName}`;
    const newProjectConfigFile = `${projectsFolder}/${projectName}/config.json`;
    const newProjectDataFile = `${projectsFolder}/${projectName}/data.json`;

    try {
        fs.mkdirSync(newProjectFolder);
        fs.writeFileSync(newProjectConfigFile, JSON.stringify(projectConfig), 'utf8');
        fs.writeFileSync(newProjectDataFile, JSON.stringify([projectBaseData]), 'utf8');

        return true;
    } catch (error) {
        return false;
    }
}

const resetProject = (baseUrl) => {
    const projectConfig = getProjectConfig(baseUrl);
    const projectName = getProjectName(baseUrl);

    if (!projectConfig) {
        return false;
    }

    const projectBaseUrl = new URL(projectConfig.baseUrl);
    const firstUrlToCrawl = projectConfig.folderRestriction ? baseUrl + projectConfig.folderRestriction : baseUrl;
    projectBaseData = getBaseDataObj(firstUrlToCrawl, projectBaseUrl.protocol);

    try {
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
    resetProject,
    getProjectName,
    getProjectConfig,
    getProjectPredefinedConfigs,
    getBaseDataObj,
    getRunningProjectsConfig,
    setRunningProject
}