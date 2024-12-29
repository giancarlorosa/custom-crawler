// Default requires
const chalk = require('chalk');
const fs = require('node:fs');
const url = require('node:url');
const path = require('path');

// Custom modules

// Local constants
const projectsFolder = './projects';

const getRunningProjectsConfig = () => {
    try {
        const runningProjectsConfig = fs.readFileSync(`${projectsFolder}/config.json`, 'utf8');
        return JSON.parse(runningProjectsConfig);
    } catch (error) {
        return [];
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

const getBaseDataObj = (url) => {
    return {
        'url': url,
        'responseUrl': null,
        'protocol': null,
        'visited': false,
        'statusCode': null,
        'externalLink': false,
        'documentLink': false,
        'absoluteLink': false,
        'pageAnchor': false,
        'missingAnchor': false,
        'links': [],
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

const getTempProjectConfig = (baseUrl, sessionId) => {
    const projectConfig = getProjectConfig(baseUrl);

    if (!projectConfig || !projectConfig?.tempConfig || projectConfig.tempConfig.sessionId !== sessionId) {
        return false;
    }

    return projectConfig.tempConfig;
}

const getProjectName = (baseUrl) => {
    try {
        const projectBaseUrl = new URL(baseUrl);
        return projectBaseUrl.hostname.replace('www.', '').replace('.', '-');
    } catch (error) {
        return false;
    }
}

function getProjectBaseListToCraw(baseUrl, folderRestriction) {
    // Always start at home page.
    let projectBaseData = [getBaseDataObj(baseUrl)];

    if (folderRestriction && typeof folderRestriction === 'string' && folderRestriction.slice(0, 1) !== '!') {
        projectBaseData.push(getBaseDataObj(baseUrl + folderRestriction.replace('/*', '')));
    }

    if (folderRestriction && Array.isArray(folderRestriction)) {
        folderRestriction.forEach(restriction => {
            const restrictionFolder = restriction.trim().replace('/*', '');
            const restrictionExists = projectBaseData.filter(project => project.url === baseUrl + restrictionFolder).length > 0;

            if (restrictionFolder.slice(0, 1) !== '!' && !restrictionExists) {
                projectBaseData.push(getBaseDataObj(baseUrl + restrictionFolder));
            }
        });
    }

    return projectBaseData;
}

const getActiveProject = (sessionId) => {
    let runningProjectsConfig = getRunningProjectsConfig();

    if (!runningProjectsConfig || !sessionId) {
        return false;
    }

    const projectsWithError = runningProjectsConfig.filter(project => {
        return project.sessionId && project.sessionId !== sessionId;
    });

    if (projectsWithError && projectsWithError.length > 0) {
        projectsWithError.forEach(project => removeRunningProject(project.baseUrl));
        runningProjectsConfig = getRunningProjectsConfig();
    }

    const tempProject = runningProjectsConfig.filter(project => project.sessionId === sessionId)[0];
    const activeProject = runningProjectsConfig.filter(project => project.active === true)[0];

    if (tempProject && getProjectConfig(tempProject?.baseUrl)) {
        return tempProject;
    }

    if (!activeProject || !getProjectConfig(activeProject?.baseUrl)) {
        setRunningProject(runningProjectsConfig[0].baseUrl);
        return runningProjectsConfig[0];
    }

    return activeProject;
}

function projectExists (baseUrl) {
    const projectConfig = getProjectConfig(baseUrl);

    if (!projectConfig || projectConfig.baseUrl !== baseUrl) {
        return false;
    }

    return true;
}

function runningProjectExists (baseUrl) {
    const runningProjectsConfig = getRunningProjectsConfig();

    if (!runningProjectsConfig) {
        return false;
    }

    return runningProjectsConfig.filter(project => project.baseUrl === baseUrl).length > 0;
}

function removeRunningProject(baseUrl) {
    const runningProjectsConfig = getRunningProjectsConfig();
    const hasRunningProject = runningProjectExists(baseUrl);
    const runningProjectConfigFile = `${projectsFolder}/config.json`;
    const projectName = getProjectName(baseUrl);
    const selectedProjectFolder = `${projectsFolder}/${projectName}`;

    try {
        if (!runningProjectsConfig || !hasRunningProject) {
            return false;
        }

        const runningProjectConfigData = runningProjectsConfig.filter(project => project.baseUrl !== baseUrl);

        fs.writeFileSync(runningProjectConfigFile, JSON.stringify(runningProjectConfigData), 'utf8');
        fs.rmSync(selectedProjectFolder, { recursive: true, force: true });
        return true;
    } catch (error) {
        return false;
    }
}

function setRunningProject(baseUrl, sessionId = false) {
    const runningProjectsConfig = getRunningProjectsConfig();
    const runningProject = runningProjectExists(baseUrl);
    const runningProjectConfigFile = `${projectsFolder}/config.json`;
    const runningProjectConfigBaseData = { baseUrl, 'active': true, sessionId };
    let runningProjectConfigData = [];

    try {
        if (!runningProjectsConfig) {
            fs.mkdirSync(projectsFolder);
            runningProjectConfigData = [runningProjectConfigBaseData];
        }

        if (runningProjectsConfig && !runningProject) {
            const inactivatedRunningProjects = runningProjectsConfig.map(project => {
                return {
                    ...project,
                    active: sessionId ? project.active : false
                }
            });

            runningProjectConfigData = [...inactivatedRunningProjects, {
                baseUrl,
                active: sessionId ? false : true,
                sessionId
            }];

            if (!baseUrl) {
                runningProjectConfigData = runningProjectsConfig;
            }
        }

        if (runningProjectsConfig && runningProject) {
            runningProjectConfigData = runningProjectsConfig.map(project => {
                if (project.baseUrl === baseUrl) {
                    return { ...project, active: true, sessionId };
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

const createProject = (baseUrl, protocol, sessionId, folderRestriction = null, pageLimit = 500, crawlingSpeed = 'fast') => {
    const folderRestrictionFormatted = folderRestriction && folderRestriction.indexOf(',') > -1 ? folderRestriction.split(',') : folderRestriction;
    const projectConfig = { baseUrl, protocol, folderRestriction: folderRestrictionFormatted, pageLimit, crawlingSpeed };
    const projectName = getProjectName(baseUrl);
    const projectBaseData = getProjectBaseListToCraw(baseUrl, folderRestrictionFormatted);

    if (projectExists(baseUrl) || !projectName || !setRunningProject(baseUrl, sessionId)) {
        return false;
    }

    const newProjectFolder = `${projectsFolder}/${projectName}`;
    const newProjectExportsFolder = `${projectsFolder}/${projectName}/exports`;
    const newProjectConfigFile = `${projectsFolder}/${projectName}/config.json`;
    const newProjectDataFile = `${projectsFolder}/${projectName}/data.json`;

    try {
        fs.mkdirSync(newProjectFolder);
        fs.mkdirSync(newProjectExportsFolder);
        fs.writeFileSync(newProjectConfigFile, JSON.stringify(projectConfig), 'utf8');
        fs.writeFileSync(newProjectDataFile, JSON.stringify(projectBaseData), 'utf8');

        return true;
    } catch (error) {
        return false;
    }
}

const updateProjectConfig = (config, isTempConfig = false) => {
    const projectConfig = getProjectConfig(config.baseUrl);
    const projectName = getProjectName(config.baseUrl);
    const folderRestrictionFormatted = config.folderRestriction && config.folderRestriction.indexOf(',') > -1 ? config.folderRestriction.split(',') : config.folderRestriction;
    let tempProjectConfig = {
        ...projectConfig,
        tempConfig: {
            baseUrl: config.baseUrl,
            protocol: config.protocol,
            sessionId: config.sessionId,
            folderRestriction: folderRestrictionFormatted,
            pageLimit: config.pageLimit,
            crawlingSpeed: config.crawlingSpeed
        }
    };

    if (!projectConfig) {
        return false;
    }

    if (!isTempConfig) {
        tempProjectConfig = config;
    }

    delete tempProjectConfig.sessionId;

    try {
        fs.writeFileSync(`${projectsFolder}/${projectName}/config.json`, JSON.stringify(tempProjectConfig), 'utf8');
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

    const projectBaseData = getProjectBaseListToCraw(baseUrl, projectConfig.folderRestriction);

    try {
        fs.writeFileSync(`${projectsFolder}/${projectName}/data.json`, JSON.stringify(projectBaseData), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    projectsFolder,
    projectExists,
    createProject,
    updateProjectConfig,
    removeRunningProject,
    resetProject,
    getProjectName,
    getProjectConfig,
    getTempProjectConfig,
    getProjectPredefinedConfigs,
    getProjectBaseListToCraw,
    getBaseDataObj,
    getRunningProjectsConfig,
    getActiveProject,
    setRunningProject
}