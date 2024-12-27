// Default requires
const prompts = require('prompts');
const chalk = require('chalk');

// Custom modules
const {
    getActiveProject,
    getRunningProjectsConfig,
    getProjectConfig,
    getProjectBaseListToCraw,
    getTempProjectConfig,
    getProjectPredefinedConfigs,
    setRunningProject,
    createProject,
    updateProjectConfig,
    removeRunningProject
} = require('./project_management');
const {
    getSessionId,
    boxedInfoMessage,
    boxedConfigMessage
} = require('./utils');
const { getCrawledLinks, storeLinkList } = require('./crawler');

const sessionId = getSessionId();

function getProjectVerification() {
    // Constants
    const runningProjects = getRunningProjectsConfig();
    const activeProject = getActiveProject(sessionId);
    const projectConfig = activeProject ? getProjectConfig(activeProject.baseUrl) : null;
    const tempProjectConfig = projectConfig ? getTempProjectConfig(activeProject.baseUrl, sessionId) : null;
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
        tempProjectConfig,
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
    const {
        projectConfig,
        tempProjectConfig,
        activeProject,
        crawledLinks,
        visitedLinks,
        linksWithError,
        notVisitedLinks
    } = getProjectVerification();

    const projectConfigCheck = tempProjectConfig && configType === 'update' ? tempProjectConfig : projectConfig;
    let projectConfigDisplay = typeof projectConfigCheck.folderRestriction === 'string' ? projectConfigCheck : { ...projectConfigCheck, folderRestriction: 'None'};
    let runningProjectFootnotes = [];
    let boxTitle = '';

    switch(configType) {
        case 'create':
            boxTitle = 'THIS IS YOUR CURRENT PROJECT CONFIGURATION';
            break;
        case 'project':
            boxTitle = 'This project already exists. What would you like to do now?';
            break;
        case 'update':
            boxTitle = 'PLEASE, CHECK YOUR NEW PROJECT CONFIGURATION';
            break;
        default:
            boxTitle = 'YOU ARE RUNNING THE FOLLOWING PROJECT RIGHT NOW';
            break;
    }

    delete projectConfigDisplay.tempConfig;
    delete projectConfigDisplay.sessionId;

    if (projectConfigCheck.folderRestriction && typeof projectConfigCheck.folderRestriction === 'object') {
        const folderRestrictions = projectConfigCheck.folderRestriction;
        let folderRestrictionsObj = {};

        // Remove older folder restrictions
        delete projectConfigDisplay.folderRestriction;

        for (let i = 1; i <= folderRestrictions.length; i++) {
            folderRestrictionsObj[`Folder restriction ${i}`] = folderRestrictions[i - 1];
        }

        projectConfigDisplay = {
            'Base URL': projectConfigCheck.baseUrl,
            'Protocol': projectConfigCheck.protocol.replace(':', ''),
            'Crawling limit': projectConfigCheck.pageLimit === 0 ? 'Unlimited' : projectConfigCheck.pageLimit,
            'Crawling speed': projectConfigCheck.crawlingSpeed,
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
            configType !== 'create' && configType !== 'update' ? runningProjectFootnotes.join("\n") : false,
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
        case 'remove':
            return removeProjectStep();
        case 'config':
            return configureProjectStep();
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
    const { projectConfig, runningProjects } = getProjectVerification();
    const localBaseUrl = baseUrl ? baseUrl : projectConfig.baseUrl;
    const crawlingSpeedSelectedOption = {
        'fast': 0,
        'medium': 1,
        'slow': 2
    }
    let preDefinedConfigs = null;


    if (baseUrl && getProjectConfig(baseUrl)) {
        setRunningProject(baseUrl);
        return firstStep('projectExists');
    }

    if (!baseUrl) {
        console.log(boxedInfoMessage(
            'Updating/changing project configuration',
            "You are about to change/update the configuration \n for the following project:",
            chalk.bold.cyanBright(projectConfig.baseUrl),
            {
                type: 'info',
                marginTop: true
            }
        ));
    }

    const configureProjectPrompt = [
        {
            type: 'select',
            name: 'hasFolderRestriction',
            message: 'Would you like to restrict your crawling process?',
            choices: [
                { title: 'No', description: 'All pages will be crawled until reach your crawling limit configuration.', value: 'no' },
                { title: 'Yes', description: 'You can restrict the crawling process to a specific folder.', value: 'yes' },
            ],
            initial: !baseUrl && projectConfig?.folderRestriction ? 1 : 0
        },
        {
            type: (prev, values) => values.hasFolderRestriction === 'yes' ? 'text' : null,
            name: 'folderRestriction',
            message: "Inform the folder to restrict your crawling process:\n(For more than one rule, use comma (,))",
            // validate: value => value.length < 2 || (value.slice(0, 1) !== '/' && value.slice(0, 2) !== '!/') ? 'Your folder can not be empty and must start with / (e.g. /locations)' : true,
            initial: !baseUrl && projectConfig?.folderRestriction ? projectConfig.folderRestriction : ''
        },
        {
            type: (prev, values) => baseUrl ? 'select' : null,
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
            type: (prev, values) => values.configType === 'manual' || !baseUrl ? 'number' : null,
            name: 'pageLimit',
            message: 'Set the limit of pages to be crawled (0 represents unlimited pages):',
            validate: value => Number.isInteger(value) && value < 0 ? 'You need to inform a valid number' : true,
            initial: !baseUrl ? projectConfig.pageLimit : 0
        },
        {
            type: (prev, values) => values.configType === 'manual' || !baseUrl ? 'select' : null,
            name: 'crawlingSpeed',
            message: 'Choose the crawling speed:',
            choices: [
                { title: 'Fast speed', description: 'No daley during the crawler process (Suitable for under than 100 pages).', value: 'fast' },
                { title: 'Medium speed', description: 'Add a 2s delay for each 50 crawled pages (Suitable between 100 to 500 pages).', value: 'medium' },
                { title: 'Slow speed', description: 'Add a 2s delay for each 10 crawled pages (Suitable for more then 500 pages).', value: 'slow' },
            ],
            initial: !baseUrl ? crawlingSpeedSelectedOption[projectConfig.crawlingSpeed] : 0
        }
    ];

    const configureProjectResult = await prompts(configureProjectPrompt);

    if (configureProjectResult.configType !== 'manual') {
        preDefinedConfigs = getProjectPredefinedConfigs(configureProjectResult.configType);
    }

    const projectCurrentConfig = {
        baseUrl: localBaseUrl,
        protocol: localBaseUrl.slice(0, localBaseUrl.indexOf(':')),
        folderRestriction: configureProjectResult.folderRestriction,
        pageLimit: preDefinedConfigs ? preDefinedConfigs.pageLimit : configureProjectResult.pageLimit,
        crawlingSpeed: preDefinedConfigs ? preDefinedConfigs.crawlingSpeed : configureProjectResult.crawlingSpeed,
    };

    if (!preDefinedConfigs?.crawlingSpeed && !configureProjectResult?.crawlingSpeed) {
        console.log(boxedInfoMessage(
            `Project ${baseUrl ? 'creation' : 'configuration'} process canceled`,
            "You will be redirected back to the first step \n in a few seconds!",
            false,
            {
                type: 'info',
                marginTop: true,
            }
        ));

        await new Promise(resolve => setTimeout(resolve, 5000));
        return firstStep();
    }

    if (!baseUrl) {
        updateProjectConfig({
            baseUrl: projectCurrentConfig.baseUrl,
            protocol: projectCurrentConfig.protocol,
            sessionId: sessionId,
            folderRestriction: projectCurrentConfig.folderRestriction,
            pageLimit: projectCurrentConfig.pageLimit,
            crawlingSpeed: projectCurrentConfig.crawlingSpeed
        }, true);
    } else {
        createProject(
            projectCurrentConfig.baseUrl,
            projectCurrentConfig.protocol,
            sessionId,
            projectCurrentConfig.folderRestriction,
            projectCurrentConfig.pageLimit,
            projectCurrentConfig.crawlingSpeed
        );
    }

    return confirmConfigurationStep(baseUrl);
}

async function confirmConfigurationStep(baseUrl) {
    const { activeProject, tempProjectConfig, crawledLinks } = getProjectVerification();
    const confirmConfigurationPrompt = [{
        type: 'confirm',
        name: 'confirmation',
        message: 'Is your project configuration correct?'
    }];

    printProjectConfig(baseUrl ? 'create' : 'update');
    const confirmConfigurationResult = await prompts(confirmConfigurationPrompt);

    if (baseUrl) {
        if (!confirmConfigurationResult.confirmation) {
            removeRunningProject(activeProject.baseUrl);
        }

        if (confirmConfigurationResult?.confirmation === true) {
            setRunningProject(activeProject.baseUrl);
        }
    } else {
        if (confirmConfigurationResult?.confirmation === true) {
            const projectBaseList = getProjectBaseListToCraw(tempProjectConfig.baseUrl, tempProjectConfig.folderRestriction);
            const notIncludedLinks = projectBaseList.filter(notIncludedLink => {
                return crawledLinks.filter(link => link.url === notIncludedLink.url).length < 1;
            });

            updateProjectConfig(tempProjectConfig);
            storeLinkList(tempProjectConfig.baseUrl, [
                ...crawledLinks,
                ...notIncludedLinks
            ])
        }
    }

    if (confirmConfigurationResult?.confirmation !== undefined) {
        return firstStep();
    }
}

async function removeProjectStep() {
    const { activeProject } = getProjectVerification();
    const confirmProjectRemovalPrompt = [{
        type: 'confirm',
        name: 'confirmation',
        message: 'Are you sure about this action?'
    }];

    let message = [];
    message.push('This action will erase the following project with');
    message.push('all its data and configuration:');
    message.push(chalk.bold.cyanBright(activeProject.baseUrl));

    console.log(boxedInfoMessage(
        'You are about to remove the following project',
        message.join("\n"),
        chalk.bold.redBright('THIS ACTION CANNOT BE UNDONE!'),
        {
            type: 'warning',
            marginTop: true,
        }
    ));

    const confirmProjectRemovalResult = await prompts(confirmProjectRemovalPrompt);

    if (confirmProjectRemovalResult.confirmation === true) {
        removeRunningProject(activeProject.baseUrl);

        let successMessage = [];
        successMessage.push('The following project is no longer part of');
        successMessage.push('your project list:');
        successMessage.push(chalk.bold.cyanBright(activeProject.baseUrl));

        console.log(boxedInfoMessage(
            'Your project was successfully removed',
            successMessage.join("\n"),
            "You will be redirected back to the first step \n in a few seconds!",
            {
                type: 'success',
                marginTop: true,
            }
        ));
    } else {
        console.log(boxedInfoMessage(
            'Project removal process canceled',
            "You will be redirected back to the \n first step in a few seconds!",
            false,
            {
                type: 'info',
                marginTop: true,
            }
        ));
    }

    await new Promise(resolve => setTimeout(resolve, 7000));
    return firstStep();
}

module.exports = {
    firstStep
}