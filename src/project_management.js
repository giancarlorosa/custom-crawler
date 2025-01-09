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
        return JSON.parse(runningProjectsConfig).filter(project => getProjectConfig(project.baseUrl));
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

function getBaseDataObj(url) {
    return {
        'url': url,
        'vl': false, // vl = Visited Link
        'sc': null, // sc = Status Code
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

function getParsedFolderRestriction(folderRestriction) {
    return folderRestriction && folderRestriction.indexOf(',') > -1 ? folderRestriction.split(',') : folderRestriction;
}

function getProjectBaseListToCraw(baseUrl, folderRestriction) {
    // Always start at home page.
    let projectBaseData = [getBaseDataObj('/')];

    if (folderRestriction && typeof folderRestriction === 'string' && folderRestriction.slice(0, 1) !== '!') {
        const restrictionFolder = folderRestriction.trim().replace('/*', '');

        if (restrictionFolder !== '' && restrictionFolder !== '/') {
            projectBaseData.push(getBaseDataObj(folderRestriction.replace('/*', '')));
        }
    }

    if (folderRestriction && Array.isArray(folderRestriction)) {
        folderRestriction.forEach(restriction => {
            const restrictionFolder = restriction.trim().replace('/*', '');
            const restrictionExists = projectBaseData.filter(project => project.url === restrictionFolder).length > 0;

            if (restrictionFolder.slice(0, 1) !== '!' && !restrictionExists && restrictionFolder !== '') {
                projectBaseData.push(getBaseDataObj(restrictionFolder));
            }
        });
    }

    return projectBaseData;
}

const getActiveProject = (sessionId) => {
    let runningProjectsConfig = getRunningProjectsConfig();

    if (!runningProjectsConfig || runningProjectsConfig.length < 1 || !sessionId) {
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

const createProject = (baseUrl, sessionId, folderRestriction = null, pageLimit = 500) => {
    const folderRestrictionFormatted = getParsedFolderRestriction(folderRestriction);
    const projectConfig = { baseUrl, folderRestriction: folderRestrictionFormatted, pageLimit };
    const projectName = getProjectName(baseUrl);
    const projectBaseData = getProjectBaseListToCraw(baseUrl, folderRestrictionFormatted);

    if (projectExists(baseUrl) || !projectName || !setRunningProject(baseUrl, sessionId)) {
        return false;
    }

    // Folders
    const newProjectFolder = `${projectsFolder}/${projectName}`;
    const newProjectExportsFolder = `${newProjectFolder}/exports`;
    const newProjectImportsFolder = `${newProjectFolder}/imports`;

    // Data Folders
    const newProjectDataFolder = `${newProjectFolder}/data`;

    // Files
    const newProjectConfigFile = `${newProjectFolder}/config.json`;
    const newProjectMappedLinksFile = `${newProjectDataFolder}/mapped_links.json`;
    const newProjectCrawlerTimeFile = `${newProjectDataFolder}/crawler_timer.json`;
    const newProjectRedirectLinksFile = `${newProjectDataFolder}/redirect_links.json`;
    const newProjectAbsoluteLinksFile = `${newProjectDataFolder}/absolute_links.json`;
    const newProjectInternalLinksFile = `${newProjectDataFolder}/internal_links.json`;
    const newProjectInternalDocumentsFile = `${newProjectDataFolder}/internal_documents.json`;
    const newProjectExternalLinksFile = `${newProjectDataFolder}/external_links.json`;
    const newProjectExternalDocumentsFile = `${newProjectDataFolder}/external_documents.json`;

    try {
        // Folder Creation
        fs.mkdirSync(newProjectFolder);
        fs.mkdirSync(newProjectExportsFolder);
        fs.mkdirSync(newProjectImportsFolder);
        fs.mkdirSync(newProjectDataFolder);

        // File Creation
        fs.writeFileSync(newProjectConfigFile, JSON.stringify(projectConfig), 'utf8');
        fs.writeFileSync(newProjectMappedLinksFile, JSON.stringify(projectBaseData), 'utf8');
        fs.writeFileSync(newProjectCrawlerTimeFile, '', 'utf8');
        fs.writeFileSync(newProjectRedirectLinksFile, '', 'utf8');
        fs.writeFileSync(newProjectAbsoluteLinksFile, '', 'utf8');
        fs.writeFileSync(newProjectInternalLinksFile, '', 'utf8');
        fs.writeFileSync(newProjectInternalDocumentsFile, '', 'utf8');
        fs.writeFileSync(newProjectExternalLinksFile, '', 'utf8');
        fs.writeFileSync(newProjectExternalDocumentsFile, '', 'utf8');

        return true;
    } catch (error) {
        return false;
    }
}

function updateProjectConfig(config, isTempConfig = false) {
    const projectConfig = getProjectConfig(config.baseUrl);
    const projectName = getProjectName(config.baseUrl);
    const folderRestrictionFormatted = getParsedFolderRestriction(config.folderRestriction);
    let tempProjectConfig = {
        ...projectConfig,
        tempConfig: {
            baseUrl: config.baseUrl,
            sessionId: config.sessionId,
            folderRestriction: folderRestrictionFormatted,
            pageLimit: config.pageLimit
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
    const projectDataFolder = `${projectsFolder}/${projectName}/data`;

    if (!projectConfig) {
        return false;
    }

    const projectBaseData = getProjectBaseListToCraw(baseUrl, projectConfig.folderRestriction);

    try {
        fs.writeFileSync(`${projectDataFolder}/mapped_links.json`, JSON.stringify(projectBaseData), 'utf8');
        fs.writeFileSync(`${projectDataFolder}/crawler_timer.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/redirect_links.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/absolute_links.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/internal_links.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/internal_documents.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/external_links.json`, '', 'utf8');
        fs.writeFileSync(`${projectDataFolder}/external_documents.json`, '', 'utf8');
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