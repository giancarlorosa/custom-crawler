// Default requires
const fs = require('node:fs');

// Custom modules
const { projectsFolder, getProjectName, } = require('./project_management.js');

const getCrawledLinks = (baseUrl) => {
    try {
        const projectName = getProjectName(baseUrl);
        const projectData = fs.readFileSync(`${projectsFolder}/${projectName}/data.json`, 'utf8');
        return JSON.parse(projectData);
    } catch (error) {
        console.log(error)
        return false;
    }
}

const startCrawlingProcess = (baseUrl) => {
    console.log('### STARTING CRAWLING PROCESS! ###');
}

module.exports = {
    startCrawlingProcess,
    getCrawledLinks
}