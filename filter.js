const fs = require('node:fs');
const path = require('path');
const chalk = require('chalk');

const absolutePath = path.resolve(__dirname, 'scrap_result.json');
let pageList = JSON.parse(fs.readFileSync(absolutePath, { encoding: 'utf8' }));

function getPageByUrl(url) {
    return pageList.filter(page => page.url === url);
}

function getPagesWithError() {
    return pageList.filter(page => page.statusCode !== 200 && page.statusCode !== 301);
}

function getPagesWithRedirect() {
    return pageList.filter(page => page.statusCode === 301);
}

function getPagesWithDocumentLinks() {
    const documentLinksObj = getDocumentLinks();

    if (documentLinksObj.length < 0) {
        return false;
    }

    const documentLinks = documentLinksObj.map(document => {
        return document.url;
    });

    return pageList.filter(page => page.links.some(link => documentLinks.includes(link)));
}

function getDocumentLinks() {
    return pageList.filter(page => page.documentLink === true && page.statusCode !== 200);
}

// ### Documents with error
// console.log(getDocumentLinks());
// console.log('Documents with problem:', chalk.black.bgYellowBright(`### ${getDocumentLinks().length} ###`));

// ### Pages with error
console.log(getPagesWithError());
console.log('Pages with problem:', chalk.black.bgYellowBright(`### ${getPagesWithError().length} ###`));

console.log('Pages crawled:', chalk.black.bgGreenBright(`### ${pageList.length} ###`));