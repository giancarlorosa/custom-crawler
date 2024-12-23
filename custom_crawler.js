// Default requires
const url = require('node:url');
const prompts = require('prompts');
const chalk = require('chalk');

// Custom modules
const { boxedConfigMessage, boxedInfoMessage } = require('./src/utils.js');
const {
    projectsFolder,
    projectExists,
    getProjectName,
    getProjectPredefinedConfigs,
    getRunningProjectsConfig,
    getActiveProject,
    createProject,
    resetProject,
    getProjectConfig,
    setRunningProject
} = require('./src/project_management.js');
const { startCrawlingProcess, getCrawledLinks } = require('./src/crawler');

// Constants
const activeProject = getActiveProject();
const projectConfig = getProjectConfig(activeProject.baseUrl);
const crawledLinks = getCrawledLinks(activeProject.baseUrl) || [];

let projectConfigDisplay = projectConfig;
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

const firstSteps = [
    {
        type: (prev, values) => getRunningProjectsConfig().length > 1 ? 'select' : null,
        name: 'actionTypeRunningProjects',
        message: 'What would you like to do?',
        choices: [
            { title: 'Filter data', value: 'filter', disabled: crawledLinks.length === 1 },
            { title: `${crawledLinks.length === 1 ? 'Start' : 'Resume'} website crawling`, value: 'resume' },
            { title: 'Reset website crawling', value: 'reset', disabled: crawledLinks.length === 1 },
            { title: 'Reconfigure project', value: 'config' },
            { title: 'Change project', value: 'change' },
            { title: 'Create a new project', value: 'start' },
        ],
        initial: crawledLinks.length > 1 ? 0 : 1
    },
    {
        type: (prev, values) => values.actionTypeRunningProjects === 'change' ? 'select' : null,
        name: 'projectSelection',
        message: 'What project you would like to work now?',
        choices: getRunningProjectsConfig()
            .filter(project => project.active === false)
            .map(project => {
                return {title: project.baseUrl, value: project.baseUrl, disabled: project.disabled}
            })
    },
    {
        type: (prev, values) => values.projectSelection ? 'select' : null,
        name: 'actionTypeRunningProjectSelected',
        message: 'What would you like to do now?',
        choices: [
            { title: 'Filter data', value: 'filter', disabled: crawledLinks.length === 1  },
            { title: `${crawledLinks.length === 1 ? 'Start' : 'Resume'} website crawling`, value: 'resume' },
            { title: 'Reset website crawling', value: 'reset', disabled: crawledLinks.length === 1 },
            { title: 'Reconfigure project', value: 'config' },
            { title: 'Cancel process', value: 'cancel' },
        ],
        initial: crawledLinks.length > 1 ? 0 : 1
    },
    {
        type: (prev, values) => getRunningProjectsConfig().length < 2 ? 'select' : null,
        name: 'actionType',
        message: 'What would you like to do:',
        choices: [
            { title: 'Create a new project', description: 'Configure a new project to run the crawling process.', value: 'start' },
            { title: 'Resume website crawling', description: 'Resume the crawling process for an existing project.', value: 'resume', disabled: getRunningProjectsConfig().length < 1 },
            { title: 'Reset website crawling', description: 'Run a completely new crawling on an already created project.', value: 'reset', disabled: getRunningProjectsConfig().length < 1 },
            { title: 'Reconfigure project', description: 'Update the current configuration for an existing project.', value: 'config', disabled: getRunningProjectsConfig().length < 1 },
            { title: 'Remove project', description: 'Remove project from project list.', value: 'remove', disabled: getRunningProjectsConfig().length < 1 },
            { title: 'Filter data', value: 'filter', disabled: getRunningProjectsConfig().length < 1 }
        ],
        initial: getRunningProjectsConfig().length > 0 ? 5 : 0
    },
    {
        type:  (prev, values) => values.actionType === 'start' || values.actionTypeRunningProjects === 'start' ? 'text' : null,
        name: 'websiteBaseUrl',
        message: 'Inform the website BASE URL: ',
        validate: value => value.length < 10 || (value.slice(0, 7) !== 'http://' && value.slice(0, 8) !== 'https://') ? `Please, inform a correct website BASE URL (https://...)` : true
    },
    {
        type: (prev, values) => projectExists(values.websiteBaseUrl) ? 'select' : null,
        name: 'actionTypeProjectExists',
        message: 'This project already exists. What would you like to do now?',
        choices: [
            { title: 'Resume website crawling', value: 'resume' },
            { title: 'Reset website crawling', value: 'reset' },
            { title: 'Reconfigure project', value: 'config' },
            { title: 'Filter data', value: 'filter' }
        ]
    },
    {
        type: (prev, values) => (values.actionType === 'start' || values.actionTypeRunningProjects === 'start') && !projectExists(values.websiteBaseUrl) ? 'select' : null,
        name: 'restrictedCrawling',
        message: 'Would you like to restrict your crawling process?',
        choices: [
            { title: 'No', description: 'All pages will be crawled until reach your crawling limit configuration.', value: 'no' },
            { title: 'Yes', description: 'You can restrict the crawling process to a specific folder.', value: 'yes' },
        ]
    },
    {
        type: (prev, values) => values.restrictedCrawling === 'yes' ? 'text' : null,
        name: 'restrictedCrawlingFolder',
        message: 'Inform the folder to restrict your crawling process: (For more than one rule, use comma)',
        validate: value => value.length < 2 || (value.slice(0, 1) !== '/' && value.slice(0, 2) !== '!/') ? 'Your folder can not be empty and must start with / (e.g. /locations)' : true
    },
    {
        type: (prev, values) => (values.actionType === 'start' || values.actionTypeRunningProjects === 'start') && !projectExists(values.websiteBaseUrl) ? 'select' : null,
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
        name: 'configScrapLimit',
        message: 'Set the limit of pages to be crawled (0 represents unlimited pages):',
        validate: value => Number.isInteger(value) && value < 0 ? 'You need to inform a valid number' : true,
        initial: 0
    },
    {
        type: (prev, values) => values.configType === 'manual' ? 'select' : null,
        name: 'configScrapSpeed',
        message: 'Choose the crawling speed:',
        choices: [
            { title: 'Fast speed', description: 'No daley during the crawler process (Suitable for under than 100 pages).', value: 'fast' },
            { title: 'Medium speed', description: 'Add a 2s delay for each 50 crawled pages (Suitable between 100 to 500 pages).', value: 'medium' },
            { title: 'Slow speed', description: 'Add a 2s delay for each 10 crawled pages (Suitable for more then 500 pages).', value: 'slow' },
        ]
    },
];

const confirmConfigSteps = [
    {
        type: 'confirm',
        name: 'confirmConfig',
        message: 'Is your project configuration correct?'
    },
    {
        type: (prev, values) => values.confirmConfig === true ? 'confirm' : null,
        name: 'confirmCrawlingStart',
        message: 'Would you like to start crawling process now?'
    }
];

const confirmResetCrawling = [
    {
        type: 'confirm',
        name: 'confirmReset',
        message: "You are about to erase ALL the collected data from your project. Are you sure about this?"
    },
    {
        type: (prev, values) => values.confirmReset === true ? 'confirm' : null,
        name: 'startCrawling',
        message: 'Would you like to start crawling process now?'
    }
]

const confirmCrawlingStartSteps = [
    {
        type: 'confirm',
        name: 'confirmStart',
        message: 'Would you like to start crawling process now?'
    }
];

(async () => {
    if (getRunningProjectsConfig().length > 0) {
        let runningProjectFootnotes = [];

        runningProjectFootnotes.push(chalk.bold.yellowBright('PROJECT STATUS:'))
        runningProjectFootnotes.push(`Links found: ${chalk.greenBright(crawledLinks.length)}`)
        runningProjectFootnotes.push(`Links tested: ${chalk.greenBright(crawledLinks.filter(link => link.visited === true).length)}`)

        console.log(boxedConfigMessage(
            'YOU ARE RUNNING THE FOLLOWING PROJECT RIGHT NOW',
            projectConfigDisplay,
            runningProjectFootnotes.join("\n"),
            true,
            true
        ));
    }

    const firstStepsResponse = await prompts(firstSteps);

    if (firstStepsResponse.actionTypeRunningProjects === 'change') {
        setRunningProject(firstStepsResponse.projectSelection);
    }

    // console.log(firstStepsResponse);

    if ((firstStepsResponse.actionType === 'start' || firstStepsResponse.actionTypeRunningProjects === 'start') && !firstStepsResponse?.actionTypeProjectExists) {
        if (!firstStepsResponse?.websiteBaseUrl) {
            return false;
        }

        const projectBaseUrlObj = new URL(firstStepsResponse.websiteBaseUrl);
        const projectBaseUrlProtocol = projectBaseUrlObj.protocol;
        const projectName = getProjectName(firstStepsResponse.websiteBaseUrl);
        const crawlingRestriction = firstStepsResponse.restrictedCrawling === 'yes' ? firstStepsResponse.restrictedCrawlingFolder : 'None';
        const crawlingRestrictionRules = crawlingRestriction ? crawlingRestriction.split(',') : null;
        const pageLimit = firstStepsResponse.configType === 'manual' ? firstStepsResponse.configScrapLimit : getProjectPredefinedConfigs(firstStepsResponse.configType)?.pageLimit;
        const crawlingSpeed = firstStepsResponse.configType === 'manual' ? firstStepsResponse.configScrapSpeed : getProjectPredefinedConfigs(firstStepsResponse.configType)?.crawlingSpeed;

        let footerNote = [];
        let newProject = false;
        let crawlingRestrictionRulesObj = {};

        footerNote.push(`${chalk.black.bgYellow('NOTE:')} You will be able to update or`);
        footerNote.push('change these configurations by editing');
        footerNote.push('the project config file at:');
        footerNote.push(chalk.bold(`${projectsFolder}/${projectName}`));

        let projectConfigDisplayOnCreation = {
            'Base URL': firstStepsResponse.baseUrl,
            'Protocol': projectBaseUrlProtocol.replace(':', ''),
            'Folder restriction': firstStepsResponse.restrictedCrawlingFolder,
            'Crawling limit': pageLimit === 0 ? 'Unlimited' : pageLimit,
            'Crawling speed': crawlingSpeed
        }

        if (crawlingRestrictionRules && crawlingRestrictionRules.length > 1) {
            for (let i = 1; i <= crawlingRestrictionRules.length; i++) {
                crawlingRestrictionRulesObj[`Folder restriction ${i}`] = crawlingRestrictionRules[i - 1].trim();
            }

            delete projectConfigDisplayOnCreation['Folder restriction'];

            projectConfigDisplayOnCreation = {
                ...projectConfigDisplayOnCreation,
                'Folder restriction rules': crawlingRestrictionRules.length,
                ...crawlingRestrictionRulesObj
            }
        }

        console.log(boxedConfigMessage(
            'THIS IS YOUR CURRENT PROJECT CONFIGURATION',
            projectConfigDisplayOnCreation,
            footerNote.join("\n"),
            true
        ));

        const confirmConfigStepsResponse = await prompts(confirmConfigSteps);
        // console.log(confirmConfigStepsResponse);

        if (confirmConfigStepsResponse.confirmConfig) {
            newProject = createProject(
                firstStepsResponse.websiteBaseUrl,
                projectBaseUrlProtocol,
                crawlingRestriction === 'None' ? null : crawlingRestrictionRules.length > 1 ? crawlingRestrictionRules : crawlingRestriction,
                pageLimit,
                crawlingSpeed
            )
        }

        if (confirmConfigStepsResponse.confirmConfig && !newProject) {
            console.log(boxedInfoMessage(
                'ERROR WHILE CREATING YOUR PROJECT',
                "Sorry, but we had an error while creating your project.\nPlease, verify your project data and try again!",
                false,
                {
                    'type': 'error',
                    'marginTop': true
                }
            ))
        }

        if (confirmConfigStepsResponse.confirmCrawlingStart && newProject) {
            console.log(boxedInfoMessage(
                'Starting the crawling process',
                "Now we will start the crawling process. \n You can cancel/pause this process any \n time and resume it in the future \n if necessary.",
                false,
                {
                    'type': 'success',
                    'marginTop': true
                }
            ));

            await new Promise(resolve => setTimeout(resolve, 3000));
            startCrawlingProcess(firstStepsResponse.websiteBaseUrl);
        }
    }

    if (firstStepsResponse.actionType === 'resume' || firstStepsResponse.actionTypeRunningProjects === 'resume' || firstStepsResponse.actionTypeRunningProjectSelected === 'resume') {
        const confirmCrawlingStartResponse = await prompts(confirmCrawlingStartSteps);

        if (confirmCrawlingStartResponse.confirmStart) {
            console.log(boxedInfoMessage(
                `${crawledLinks.length === 1 ? 'Starting' : 'Resuming'} your crawling process`,
                "Now we will start the crawling process. \n You can cancel/pause this process any \n time and resume it in the future \n if necessary.",
                false,
                {
                    'type': 'success',
                    'marginTop': true
                }
            ));

            await new Promise(resolve => setTimeout(resolve, 3000));
            startCrawlingProcess(activeProject.baseUrl)
        }
    }

    if (firstStepsResponse.actionType === 'reset' || firstStepsResponse.actionTypeRunningProjects === 'reset' || firstStepsResponse.actionTypeRunningProjectSelected === 'reset') {
        const confirmResetCrawlingResponse = await prompts(confirmResetCrawling);

        if (confirmResetCrawlingResponse.confirmReset) {
            resetProject(activeProject.baseUrl);
        }

        if (confirmResetCrawlingResponse.startCrawling) {
            console.log(boxedInfoMessage(
                'crawling process successfully reset',
                "Now we will start the crawling process. \n You can cancel/pause this process any \n time and resume it in the future \n if necessary.",
                false,
                {
                    'type': 'success',
                    'marginTop': true
                }
            ));

            await new Promise(resolve => setTimeout(resolve, 3000));
            startCrawlingProcess(activeProject.baseUrl)
        }
    }
})();