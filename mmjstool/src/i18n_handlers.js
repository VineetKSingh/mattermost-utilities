// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const path = require('path');

const sortJson = require('sort-json');

const i18nExtractLib = require('./i18n_extract');

function difference(setA, setB) {
    var differenceSet = new Set(setA);
    for (var elem of setB) {
        differenceSet.delete(elem);
    }
    return differenceSet;
}

function getCurrentTranslations(webappDir, mobileDir) {
    const currentWebappTranslationsJson = fs.readFileSync(path.join(webappDir, 'i18n', 'en.json'));
    const currentWebappTranslations = JSON.parse(currentWebappTranslationsJson);

    const currentMobileTranslationsJson = fs.readFileSync(path.join(mobileDir, 'assets', 'base', 'i18n', 'en.json'));
    const currentMobileTranslations = JSON.parse(currentMobileTranslationsJson);

    return {
        webapp: currentWebappTranslations,
        mobile: currentMobileTranslations,
    };
}

export function i18nCheck(argv) {
    const webappDir = argv['webapp-dir'];
    const mobileDir = argv['mobile-dir'];

    const currentTranslations = getCurrentTranslations(webappDir, mobileDir);
    const currentWebappKeys = new Set(Object.keys(currentTranslations.webapp));
    const currentMobileKeys = new Set(Object.keys(currentTranslations.mobile));

    const promise1 = i18nExtractLib.extractFromDirectory([argv['webapp-dir']], ['dist', 'node_modules', 'non_npm_dependencies', 'tests']);
    const promise2 = i18nExtractLib.extractFromDirectory([argv['mobile-dir'] + '/app', argv['mobile-dir'] + '/share_extension'], []);
    Promise.all([promise1, promise2]).then(([translationsWebapp, translationsMobile]) => {
        const webappKeys = new Set(Object.keys(translationsWebapp));
        const mobileKeys = new Set(Object.keys(translationsMobile));

        for (const key of difference(currentWebappKeys, webappKeys)) {
            // eslint-disable-next-line no-console
            console.log('Removed from webapp:', key);
        }
        for (const key of difference(webappKeys, currentWebappKeys)) {
            // eslint-disable-next-line no-console
            console.log('Added to webapp:', key);
        }

        for (const key of difference(currentMobileKeys, mobileKeys)) {
            // eslint-disable-next-line no-console
            console.log('Removed from mobile:', key);
        }
        for (const key of difference(mobileKeys, currentMobileKeys)) {
            // eslint-disable-next-line no-console
            console.log('Added to mobile:', key);
        }
    });
}

export function i18nExtractWebapp(argv) {
    const webappDir = argv['webapp-dir'];
    const mobileDir = argv['mobile-dir'];

    const currentTranslations = getCurrentTranslations(webappDir, mobileDir);
    const currentWebappKeys = new Set(Object.keys(currentTranslations.webapp));

    i18nExtractLib.extractFromDirectory([argv['webapp-dir']], ['dist', 'node_modules', 'non_npm_dependencies', 'tests']).then((translationsWebapp) => {
        const webappKeys = new Set(Object.keys(translationsWebapp));

        for (const key of difference(currentWebappKeys, webappKeys)) {
            delete currentTranslations.webapp[key];
        }
        for (const key of difference(webappKeys, currentWebappKeys)) {
            currentTranslations.webapp[key] = translationsWebapp[key];
        }

        const options = {ignoreCase: true, reverse: false, depth: 1};
        const sortedWebappTranslations = sortJson(currentTranslations.webapp, options);
        fs.writeFileSync(path.join(webappDir, 'i18n', 'en.json'), JSON.stringify(sortedWebappTranslations, null, 2));
    });
}

export function i18nExtractMobile(argv) {
    const webappDir = argv['webapp-dir'];
    const mobileDir = argv['mobile-dir'];

    const currentTranslations = getCurrentTranslations(webappDir, mobileDir);
    const currentMobileKeys = new Set(Object.keys(currentTranslations.mobile));

    i18nExtractLib.extractFromDirectory([argv['mobile-dir'] + '/app', argv['mobile-dir'] + '/share_extension'], []).then((translationsMobile) => {
        const mobileKeys = new Set(Object.keys(translationsMobile));

        for (const key of difference(currentMobileKeys, mobileKeys)) {
            delete currentTranslations.mobile[key];
        }
        for (const key of difference(mobileKeys, currentMobileKeys)) {
            currentTranslations.mobile[key] = translationsMobile[key];
        }

        const options = {ignoreCase: true, reverse: false, depth: 1};
        const sortedMobileTranslations = sortJson(currentTranslations.mobile, options);
        fs.writeFileSync(path.join(mobileDir, 'assets', 'base', 'i18n', 'en.json'), JSON.stringify(sortedMobileTranslations, null, 2));
    });
}

export function i18nCombine(argv) {
    const webappDir = argv['webapp-dir'];
    const mobileDir = argv['mobile-dir'];
    const outputFile = argv.output;

    const currentTranslations = getCurrentTranslations(webappDir, mobileDir);

    const translations = {};

    for (const key in currentTranslations.mobile) {
        if ({}.hasOwnProperty.call(currentTranslations.mobile, key)) {
            translations[key] = currentTranslations.mobile[key];
        }
    }

    for (const key in currentTranslations.webapp) {
        if ({}.hasOwnProperty.call(currentTranslations.webapp, key)) {
            translations[key] = currentTranslations.webapp[key];
        }
    }

    const options = {ignoreCase: true, reverse: false, depth: 1};
    const sortedTranslations = sortJson(translations, options);
    fs.writeFileSync(outputFile, JSON.stringify(sortedTranslations, null, 2));
}

export function i18nSplit(argv) {
    const webappDir = argv['webapp-dir'];
    const mobileDir = argv['mobile-dir'];
    const inputFiles = argv.inputs.split(',');

    const promise1 = i18nExtractLib.extractFromDirectory([argv['webapp-dir']], ['dist', 'node_modules', 'non_npm_dependencies', 'tests']);
    const promise2 = i18nExtractLib.extractFromDirectory([argv['mobile-dir'] + '/app', argv['mobile-dir'] + '/share_extension'], []);
    Promise.all([promise1, promise2]).then(([translationsWebapp, translationsMobile]) => {
        for (const inputFile of inputFiles) {
            const filename = path.basename(inputFile.trim());
            const allTranslationsJson = fs.readFileSync(inputFile.trim());
            const allTranslations = JSON.parse(allTranslationsJson);

            const webappKeys = new Set(Object.keys(translationsWebapp));
            const mobileKeys = new Set(Object.keys(translationsMobile));

            const translationsWebappOutput = {};
            for (const key of webappKeys) {
                translationsWebappOutput[key] = allTranslations[key];
            }

            const translationsMobileOutput = {};
            for (const key of mobileKeys) {
                translationsMobileOutput[key] = allTranslations[key];
            }

            const options = {ignoreCase: true, reverse: false, depth: 1};
            const sortedWebappTranslations = sortJson(translationsWebappOutput, options);
            const sortedMobileTranslations = sortJson(translationsMobileOutput, options);
            fs.writeFileSync(path.join(webappDir, 'i18n', filename), JSON.stringify(sortedWebappTranslations, null, 2));
            fs.writeFileSync(path.join(mobileDir, 'assets', 'base', 'i18n', filename), JSON.stringify(sortedMobileTranslations, null, 2));
        }
    });
}
