const path = require('node:path')
const fs = require('fs-extra')

const validateTemplateDirectory = (templatePath, templateSource) => {
    if (!fs.existsSync(templatePath)) {
        throw new Error(
            `Template path "${templatePath}" from source "${templateSource}" does not exist.`
        )
    }

    const stats = fs.statSync(templatePath)
    if (!stats.isDirectory()) {
        throw new Error(
            `Template path "${templatePath}" from source "${templateSource}" is not a directory.`
        )
    }

    const packageJsonPath = path.join(templatePath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(
            `Template source "${templateSource}" is missing "package.json" at "${templatePath}".`
        )
    }
}

module.exports = validateTemplateDirectory
