# Node Custom Crawler Project

![GitHub package.json version](https://img.shields.io/github/package-json/v/giancarlorosa/custom-crawler)

## Project objective

This is a personal project from the creator **Giancarlo Rosa** to be used to crawl links from a website. Many tools already do that and have better navigation screens and user experience, but usually, all these tools are paid. This tool intends to provide an alternative way to crawl websites to find broken links and broken documents, without the need to contract a more complex tool and pay for it. The other objective of this tool is to give autonomy to a team to test a website without the need to wait for a lead or wait for an access to a shared tool to check the links from a website.

As it was necessary to create it quickly, some features were not included, like **Typescript** and **Unity Tests**. But there are plans to implement them in the future. There are other features planned for the future, but for now, this tool covers just two different filters, one related to **broken links**, and another filter specifically showing links from **broken documents**. Other filters will be added, but as this is a custom crawler tool, you are free to add any other kind of filter that you need, as the crawler already does the best part of getting the links and checking them.

## About the project

This is a **Node** project using just Javascript in its core.

To run the project on your computer, you will need **Node v22** installed and **NPM** too.

To install the project, run the following command:

```bash
npm install
```

As the project uses **Prompts** package, you need just one command to run the project. All other options will be shown as options to be selected.

```bash
node index
```

### Available options

These are the available options that you will find during the **Custom Crawler** execution:

#### Create a new project

This option will allow you to add a new website to crawl all the available links.

##### Inform the website BASE URL

The first thing that you need to inform is its **Base URL**. This is the complete address to the website that you want to crawl.

```bash
https://www.domain.com
```

##### Would you like to restrict your crawling process

The second available configuration is related to folder restrictions. In the case of the need to restrict the crawling to a specific folder, or not **crawl** a folder, you can inform at this step. If you set this step empty, the crawling tool will visit all the found pages.

To crawl just one specific page, you need to inform just the folder name with the slash (/):

```bash
/location
```

If you need to crawl all the pages inside the /location folder, you need to add the asterisk at the end of the folder:

```bash
/location/*
```

To avoid some folders, add the exclamation at the beginning of the folder name:

```bash
!/location/*
```

If you need to inform more than one folder at a time, split it using a comma.

```bash
/location, /location/*, !/location/hotels, !/location/restaurants/*
```

##### Set the limit of pages to be crawled

This configuration allows to define a limit of pages to be crawled. The default value is **0** which represents **Unlimited**. This configuration is being analyzed to see if has a real purpose. If we find that it's not being used, we will remove it in the future.

#### Start/Resume website crawling

This option allows you to start or resume the crawling process from a website. The needed time to crawl all links will depend on the website size, the website server speed, and how many external links it has.

Usually, a website with **5000** links takes more or less 20 to 30 minutes to finish.

And don't worry, you can stop/interrupt the crawling process at any moment by typing **Ctrl+C**. The next time that you access the tool, you can resume the crawling process from the last tested link.

#### Reset website crawling

This option allows you to erase all found data from a website to run the crawler again. Maybe your team made fixes to the website and you want to double-check all the links. So, you can reset the data from a project and run the crawling process all over again.

#### Reconfigure project

This option allows you to change a project configuration. 

#### Remove project

This option allows you to remove a project from your project list. Remember that all collected data from this project will be deleted too.

#### Change project

This option allows you to navigate through all available projects that you have added.

#### Filter data

This option allows you to filter data from a crawled website. For now, we have just two available filters:

##### Links with error

This filter will show all links that did not load, regardless of the reason. This filter does not include document links.

##### Documents with error

This filter will show all links pointing to any documents that did not load.

##### Exporting data

After selecting a filter, you will be able to export this data into a **.CSV** file to track on your website the pages to fix all these links. 

The results will be exported to a folder called **/exports** inside your project folder.

```bash
/projects/domain-com/exports/Document links with error.csv
```

#### Cancel

This option just closes the application.

## Future features

This is a very small project that has the objective to help find some broken links inside websites. We already have more complex and better tools in marketing in case of need a more robust solution.

But, even that, there are some other features that I would love to add to this tool!

### Retest only broken links

Instead of resetting the website data to retest all the fixed issues, I would love to add a feature to retest only the broken links. I believe this could help a lot in the future.

### Test a .CSV file

Sometimes the clients send us a list of pages to check after a migration or a website implementation. In the future, I would love to enable the possibility to test specifically this list of pages to gain some time.

### Create an NPX command

I'm thinking about creating an NPX command to make it easier to execute the application from anywhere. But for now, it's just an idea.

### Add new filters

For now, we just have two different filters, but in the future I would love to add the following new filters to the project:
- Missing anchors (List of all link anchors that don't have an anchor element in the page)
- Redirect pages (List all redirects to decrease its incidence)
- Broken images (Find all broken images)
- Phone and Mailto link (Still thinking if it's necessary)

## Questions/Issues

Feel free to contact me in case of finding any issue related to this tool. And if you have any good ideas to improve my Custom Crawler, just send me and email.

**Thanks all!**
