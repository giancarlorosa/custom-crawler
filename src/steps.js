// Default requires
const prompts = require('prompts');
const chalk = require('chalk');

// Custom modules
const {
    getActiveProject,
    getRunningProjectsConfig,
    getProjectConfig,
    getProjectPredefinedConfigs,
    setRunningProject,
    createProject,
    removeRunningProject
} = require('./project_management');
const { getCrawledLinks } = require('./crawler');
const { getSessionId, boxedConfigMessage } = require('./utils');

const sessionId = getSessionId();

function getProjectVerification() {
    // Constants
    const runningProjects = getRunningProjectsConfig();
    const activeProject = getActiveProject(sessionId);
    const projectConfig = activeProject ? getProjectConfig(activeProject.baseUrl) : null;
    const crawledLinks = activeProject ? getCrawledLinks(activeProject.baseUrl) : null;
    const visitedLinks = crawledLinks ? crawledLinks.filter(link => link.visited === true) : null;
    const notVisitedLinks = crawledLinks ? crawledLinks.filter(link => link.visited === false) : null;
    const linksWithError = visitedLinks ? visitedLinks.filter(link => link.statusCode !== 200 && link.statusCode !== 301) : null;

    // Verifications
    const hasActiveProject = activeProject ? true :  false;
    const hasVisitedLinks = !visitedLinks ? false : visitedLinks.length > 0 ? true : false;
    const hasNotVisitedLinks = !notVisitedLinks ? false : notVisitedLinks.length > 0 ? true : false;
    const hasOtherRunningProjects = () => {
        if (!runningProjects || !activeProject) {
            return false;
        }

        const availableProjects = runningProjects.filter(project => {
            return project.baseUrl !== activeProject.baseUrl;
        });

        return availableProjects.length > 0;
    }

    // console.log('Running projects:', runningProjects);
    // console.log('Active project:', activeProject);
    // console.log('Crawled links:', crawledLinks.length);
    // console.log('Visited links:', visitedLinks.length);
    // console.log('Not visited links:', notVisitedLinks.length);
    // console.log('Has visited links:', hasVisitedLinks);
    // console.log('Has not visited links:', hasNotVisitedLinks);
    // console.log('Has other projects:', hasOtherRunningProjects());

    return {
        runningProjects,
        activeProject,
        projectConfig,
        crawledLinks,
        visitedLinks,
        notVisitedLinks,
        linksWithError,
        hasActiveProject,
        hasVisitedLinks,
        hasNotVisitedLinks,
        hasOtherRunningProjects
    }
}

function printProjectConfig(configType = null) {
    const { projectConfig, activeProject, crawledLinks, visitedLinks, linksWithError, notVisitedLinks } = getProjectVerification();
    let projectConfigDisplay = typeof projectConfig.folderRestriction === 'string' ? projectConfig : { ...projectConfig, folderRestriction: 'None'};
    let runningProjectFootnotes = [];
    let boxTitle = '';

    switch(configType) {
        case 'create':
            boxTitle = 'THIS IS YOUR CURRENT PROJECT CONFIGURATION';
            break;
        case 'project':
            boxTitle = 'This project already exists. What would you like to do now?';
            break;
        default:
            boxTitle = 'YOU ARE RUNNING THE FOLLOWING PROJECT RIGHT NOW';
            break;
    }

    if (projectConfig.folderRestriction && typeof projectConfig.folderRestriction === 'object') {
        const folderRestrictions = projectConfig.folderRestriction;
        let folderRestrictionsObj = {};

        // Remove older folder restrictions
        delete projectConfigDisplay.folderRestriction;

        for (let i = 1; i <= folderRestrictions.length; i++) {
            folderRestrictionsObj[`Folder restriction ${i}`] = folderRestrictions[i - 1];
        }

        projectConfigDisplay = {
            'Base URL': projectConfig.baseUrl,
            'Protocol': projectConfig.protocol.replace(':', ''),
            'Crawling limit': projectConfig.pageLimit === 0 ? 'Unlimited' : projectConfig.pageLimit,
            'Crawling speed': projectConfig.crawlingSpeed,
            'Folder restrictions rules': folderRestrictions.length,
            ...folderRestrictionsObj
        }
    }

    if (activeProject) {
        runningProjectFootnotes.push(chalk.bold.yellowBright('PROJECT STATUS:'))
        runningProjectFootnotes.push(`Links found: ${chalk.bold.cyanBright(crawledLinks.length)}`)
        runningProjectFootnotes.push(`Links tested: ${chalk.bold.greenBright(visitedLinks.length)}`)

        if (notVisitedLinks.length > 0) {
            runningProjectFootnotes.push(`Links to test: ${chalk.bold.yellowBright(notVisitedLinks.length)}`)
        }

        if (linksWithError.length > 0) {
            runningProjectFootnotes.push(`Links with error: ${chalk.bold.redBright(linksWithError.length)}`)
        }

        console.log(boxedConfigMessage(
            boxTitle,
            projectConfigDisplay,
            runningProjectFootnotes.join("\n"),
            true,
            true
        ));
    }
}

async function firstStep(configType = null) {
    const {
        projectConfig,
        hasActiveProject,
        hasVisitedLinks,
        hasNotVisitedLinks,
        hasOtherRunningProjects
    } = getProjectVerification();
    const startResumeTitle = !hasVisitedLinks ? 'Start' : 'Resume';
    const getInitialOption = () => {
        if (!projectConfig) {
            return 0;
        }

        if (hasNotVisitedLinks) {
            return 1;
        }

        if (!hasNotVisitedLinks) {
            return 6;
        }
    }

    const firstStepPrompt = [
        {
            type: 'select',
            name: 'actionType',
            message: 'What would you like to do:',
            choices: [
                {
                    title: 'Create a new project',
                    description: 'Configure a new project to run the crawling process.',
                    value: 'create',
                    disabled: false
                },
                {
                    title: `${startResumeTitle} website crawling`,
                    description: `${startResumeTitle} the crawling process for the active project.`,
                    value: 'start',
                    disabled: !hasActiveProject || !hasNotVisitedLinks
                },
                {
                    title: 'Reset website crawling',
                    description: 'Erase all data from active project and run a new crawling process.',
                    value: 'reset',
                    disabled: !hasActiveProject || !hasVisitedLinks
                },
                {
                    title: 'Reconfigure project',
                    description: 'Update the current configuration for the active project.',
                    value: 'config',
                    disabled: !hasActiveProject
                },
                {
                    title: 'Remove project',
                    description: 'Remove the active project from project list.',
                    value: 'remove',
                    disabled: !hasActiveProject
                },
                {
                    title: 'Change project',
                    description: 'Select a different project from the project list.',
                    value: 'change',
                    disabled: !hasOtherRunningProjects()
                },
                {
                    title: 'Filter data',
                    description: 'Filter the collected data from the active project.',
                    value: 'filter',
                    disabled: !hasVisitedLinks
                }
            ],
            initial: getInitialOption()
        }
    ];

    printProjectConfig(configType);
    const firstStepResult = await prompts(firstStepPrompt);

    switch(firstStepResult.actionType) {
        case 'create':
            return createProjectStep();
        case 'change':
            return projectSelectionStep();
        default:
            return firstStepResult;
    }
}

async function projectSelectionStep() {
    const { projectConfig, runningProjects } = getProjectVerification();

    if (!projectConfig) {
        return false;
    }

    const initialOption = runningProjects.map(project => project.active).indexOf(true);
    const availableProjects = runningProjects
        .map(project => {
            return {
                title: project.baseUrl,
                value: project.baseUrl
            }
        });

    const projectSelectionPrompt = [{
        type: 'select',
        name: 'baseUrl',
        message: 'What project you would like to work now?',
        choices: availableProjects,
        initial: initialOption
    }];

    const projectSelectionResult = await prompts(projectSelectionPrompt);
    setRunningProject(projectSelectionResult.baseUrl);

    return firstStep();
}

async function createProjectStep() {
    const createProjectPrompt = [{
        type:  'text',
        name: 'baseUrl',
        message: 'Inform the website BASE URL: ',
        validate: value => value.length < 10 || (value.slice(0, 7) !== 'http://' && value.slice(0, 8) !== 'https://') ? `Please, inform a correct website BASE URL (https://...)` : true
    }];

    const createProjectResult = await prompts(createProjectPrompt);
    return createProjectResult.baseUrl ? configureProjectStep(createProjectResult.baseUrl) : firstStep();
}

async function configureProjectStep(baseUrl = null) {
    let { projectConfig, runningProjects } = getProjectVerification();
    let preDefinedConfigs = null;

    if (baseUrl && getProjectConfig(baseUrl)) {
        setRunningProject(baseUrl);
        return firstStep('projectExists');
    }

    const configureProjectPrompt = [
        {
            type: 'select',
            name: 'hasFolderRestriction',
            message: 'Would you like to restrict your crawling process?',
            choices: [
                { title: 'No', description: 'All pages will be crawled until reach your crawling limit configuration.', value: 'no' },
                { title: 'Yes', description: 'You can restrict the crawling process to a specific folder.', value: 'yes' },
            ]
        },
        {
            type: (prev, values) => values.hasFolderRestriction === 'yes' ? 'text' : null,
            name: 'folderRestriction',
            message: 'Inform the folder to restrict your crawling process: (For more than one rule, use comma (,))',
            validate: value => value.length < 2 || (value.slice(0, 1) !== '/' && value.slice(0, 2) !== '!/') ? 'Your folder can not be empty and must start with / (e.g. /locations)' : true
        },
        {
            type: 'select',
            name: 'configType',
            message: 'How would you like to configure your project?',
            choices: [
                { title: 'Use configuration tool', description: 'Some questions will be present to you to configure the project.', value: 'manual' },
                { title: 'Use default settings for small websites', description: 'Designed for websites with lass than 100 pages (Fast crawling speed).', value: 'small' },
                { title: 'Use default settings for medium websites', description: 'Designed for websites with between 100 to 500 pages (Medium crawling speed).', value: 'medium' },
                { title: 'Use default settings for large websites', description: 'Designed for websites with with more than 500 pages (Slow crawling speed).', value: 'large' },
            ]
        },
        {
            type: (prev, values) => values.configType === 'manual' ? 'number' : null,
            name: 'pageLimit',
            message: 'Set the limit of pages to be crawled (0 represents unlimited pages):',
            validate: value => Number.isInteger(value) && value < 0 ? 'You need to inform a valid number' : true,
            initial: 0
        },
        {
            type: (prev, values) => values.configType === 'manual' ? 'select' : null,
            name: 'crawlingSpeed',
            message: 'Choose the crawling speed:',
            choices: [
                { title: 'Fast speed', description: 'No daley during the crawler process (Suitable for under than 100 pages).', value: 'fast' },
                { title: 'Medium speed', description: 'Add a 2s delay for each 50 crawled pages (Suitable between 100 to 500 pages).', value: 'medium' },
                { title: 'Slow speed', description: 'Add a 2s delay for each 10 crawled pages (Suitable for more then 500 pages).', value: 'slow' },
            ]
        }
    ];

    const configureProjectResult = await prompts(configureProjectPrompt);

    if (configureProjectResult.configType !== 'manual') {
        preDefinedConfigs = getProjectPredefinedConfigs(configureProjectResult.configType);
    }

    const projectCurrentConfig = {
        baseUrl,
        protocol: baseUrl.slice(0, baseUrl.indexOf(':')),
        folderRestriction: configureProjectResult.folderRestriction,
        pageLimit: preDefinedConfigs ? preDefinedConfigs.pageLimit : configureProjectResult.pageLimit,
        crawlingSpeed: preDefinedConfigs ? preDefinedConfigs.crawlingSpeed : configureProjectResult.crawlingSpeed,
    };

    createProject(
        projectCurrentConfig.baseUrl,
        projectCurrentConfig.protocol,
        sessionId,
        projectCurrentConfig.folderRestriction,
        projectCurrentConfig.pageLimit,
        projectCurrentConfig.crawlingSpeed
    );

    return confirmConfigurationStep(baseUrl);
}

async function confirmConfigurationStep(baseUrl) {
    const { activeProject } = getProjectVerification();
    const confirmConfigurationPrompt = [{
        type: 'confirm',
        name: 'confirmation',
        message: 'Is your project configuration correct?'
    }];

    printProjectConfig('create');
    const confirmConfigurationResult = await prompts(confirmConfigurationPrompt);

    if (!confirmConfigurationResult.confirmation) {
        removeRunningProject(activeProject.baseUrl);
    }

    if (confirmConfigurationResult?.confirmation === true) {
        setRunningProject(activeProject.baseUrl);
        return firstStep();
    }
}

module.exports = {
    firstStep
}