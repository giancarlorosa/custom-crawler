// Default requires
const chalk = require('chalk');
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

const getActiveProject = () => {
    const runningProjectsConfig = getRunningProjectsConfig();

    if (!runningProjectsConfig) {
        return false;
    }

    const activeProject = runningProjectsConfig.filter(project => project.active === true)[0];

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

function setRunningProject(baseUrl) {
    const runningProjectsConfig = getRunningProjectsConfig();
    const runningProject = runningProjectExists(baseUrl);
    const runningProjectConfigFile = `${projectsFolder}/config.json`;
    const runningProjectConfigBaseData = { baseUrl, 'active': true, 'disabled': false };
    let runningProjectConfigData = [];

    try {
        if (!runningProjectsConfig) {
            fs.mkdirSync(projectsFolder);
            runningProjectConfigData = [runningProjectConfigBaseData];
        }

        if (runningProjectsConfig && !runningProject) {
            const inactivatedRunningProjects = runningProjectsConfig.map(project => { return { ...project, active: false, disabled: !projectExists(project.baseUrl) } });
            runningProjectConfigData = [...inactivatedRunningProjects, { baseUrl, active: true, disabled: !projectExists(baseUrl) }];

            if (!baseUrl) {
                runningProjectConfigData = runningProjectsConfig;
            }
        }

        if (runningProjectsConfig && runningProject) {
            runningProjectConfigData = runningProjectsConfig.map(project => {
                const disabled = !projectExists(project.baseUrl);

                if (project.baseUrl === baseUrl) {
                    return { ...project, active: true, disabled };
                }

                return { ...project, active: false, disabled };
            });
        }

        fs.writeFileSync(runningProjectConfigFile, JSON.stringify(runningProjectConfigData), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

const createProject = (baseUrl, protocol, folderRestriction = null, pageLimit = 500, crawlingSpeed = 'fast') => {
    const projectConfig = { baseUrl, protocol, folderRestriction, pageLimit, crawlingSpeed };
    const projectName = getProjectName(baseUrl);
    const projectBaseData = getProjectBaseListToCraw(baseUrl, folderRestriction);

    if (projectExists(baseUrl) || !projectName || !setRunningProject(baseUrl)) {
        return false;
    }

    const newProjectFolder = `${projectsFolder}/${projectName}`;
    const newProjectConfigFile = `${projectsFolder}/${projectName}/config.json`;
    const newProjectDataFile = `${projectsFolder}/${projectName}/data.json`;

    try {
        fs.mkdirSync(newProjectFolder);
        fs.writeFileSync(newProjectConfigFile, JSON.stringify(projectConfig), 'utf8');
        fs.writeFileSync(newProjectDataFile, JSON.stringify(projectBaseData), 'utf8');

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
    exportsFolder,
    projectExists,
    createProject,
    resetProject,
    getProjectName,
    getProjectConfig,
    getProjectPredefinedConfigs,
    getBaseDataObj,
    getRunningProjectsConfig,
    getActiveProject,
    setRunningProject
}