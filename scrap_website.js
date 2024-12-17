const prompts = require('prompts');

const questions = [
    {
        type: 'select',
        name: 'actionType',
        message: 'What would you like to do:',
        choices: [
            { title: 'Start crawling a website', value: 'scrapStart' },
            { title: 'Resume website crawling', description: 'If you already had created a project and just want to resume the crawling process.', value: 'scrapResume' },
            { title: 'Filter data from a crawled website', value: 'filter' }
        ]
    },
    {
        type: 'text',
        name: 'websiteBaseUrl',
        message: 'Inform the website BASE URL: ',
        validate: value => value.length < 10 || (value.slice(0, 7) !== 'http://' && value.slice(0, 8) !== 'https://') ? `Please, inform a correct website BASE URL (https://...)` : true
    },
    {
        type: (prev, values) => values.actionType === 'scrapStart' ? 'select' : null,
        name: 'configType',
        message: (prev, values) => `How would you like to configure your crawling project for the website  ${values.websiteBaseUrl}?`,
        choices: [
            { title: 'Use configuration tool', description: 'Some questions will be present to you to configure the project.', value: 'manual' },
            { title: 'Use default settings for small websites', description: 'Designed for websites with lass than 100 pages (Fast crawling speed).', value: 'defaultSm' },
            { title: 'Use default settings for medium websites', description: 'Designed for websites with between 100 to 500 pages (Medium crawling speed).', value: 'defaultMd' },
            { title: 'Use default settings for large websites', description: 'Designed for websites with with more than 500 pages (Slow crawling speed).', value: 'defaultLg' },
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
    {
        type: (prev, values) => values.configType === 'manual' ? 'confirm' : null,
        name: 'confirmConfigScrap',
        message: (prev, values) => `Confirm you project configuration:\n Base URL: ${values.websiteBaseUrl} \n Crawler page limit: ${values.configScrapLimit} \n Crawler speed: ${values.configScrapSpeed} \n`
    },
    {
        type: (prev, values) => values.actionType === 'scrapStart' ? 'confirm' : null,
        name: 'confirmScrapStart',
        message: (prev, values) => `Would you like to start the crawling process for the project ${values.websiteBaseUrl}?`,
    },
    {
        type: (prev, values) => values.actionType === 'scrapResume' ? 'confirm' : null,
        name: 'confirmScrapResume',
        message: (prev, values) => `Would you like to resume the crawling process for the project ${values.websiteBaseUrl}?`,
    }
];

(async () => {
    const response = await prompts(questions);
    console.log(response);
})();