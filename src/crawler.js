// Default requires

const getBaseDataObj = (baseUrl, protocol) => {
    return {
        'url': baseUrl,
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

module.exports = { getBaseDataObj }