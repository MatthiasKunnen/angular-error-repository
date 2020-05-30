function mapFilenames(filenames) {
    return filenames.map(filename => `"${filename}"`).join(' ');
}

module.exports = {
    '**/*.ts': (filenames) => [
        `eslint --fix --cache ${mapFilenames(filenames)}`,
        `yarn run compile:ts`,
    ],
};
