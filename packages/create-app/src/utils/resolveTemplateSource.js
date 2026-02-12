const os = require('node:os')
const path = require('node:path')
const { exec } = require('@dhis2/cli-helpers-engine')
const fs = require('fs-extra')
const {
    isGitTemplateSpecifier,
    parseGitTemplateSpecifier,
} = require('./isGitTemplateSpecifier')

const ensureTemplateDirectory = (templatePath, templateSource) => {
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

const resolveSubdirectory = (repoPath, subdir, templateSource) => {
    if (!subdir) {
        return repoPath
    }

    const cleanedSubdir = subdir.replace(/^\/+/, '')
    const resolvedTemplatePath = path.resolve(repoPath, cleanedSubdir)
    const repoPathWithSep = `${path.resolve(repoPath)}${path.sep}`
    const validPath =
        resolvedTemplatePath === path.resolve(repoPath) ||
        resolvedTemplatePath.startsWith(repoPathWithSep)
    if (!validPath) {
        throw new Error(
            `Invalid template subdirectory "${subdir}" in "${templateSource}". It resolves outside of the repository.`
        )
    }
    return resolvedTemplatePath
}

const resolveTemplateSource = async (templateSource, builtInTemplateMap) => {
    const normalizedTemplateSource = String(templateSource || '').trim()
    const builtInPath = builtInTemplateMap[normalizedTemplateSource]
    if (builtInPath) {
        ensureTemplateDirectory(builtInPath, normalizedTemplateSource)
        return {
            templatePath: builtInPath,
            cleanup: async () => {},
        }
    }

    if (!isGitTemplateSpecifier(normalizedTemplateSource)) {
        throw new Error(
            `Unknown template "${normalizedTemplateSource}". Use one of [${Object.keys(
                builtInTemplateMap
            ).join(', ')}] or a GitHub template specifier like "owner/repo#ref:subdir".`
        )
    }

    const parsedSpecifier = parseGitTemplateSpecifier(normalizedTemplateSource)
    const tempBase = fs.mkdtempSync(
        path.join(os.tmpdir(), 'd2-create-template-source-')
    )
    const clonedRepoPath = path.join(tempBase, 'repo')

    try {
        const gitCloneArgs = parsedSpecifier.ref
            ? [
                  'clone',
                  '--depth',
                  '1',
                  '--branch',
                  parsedSpecifier.ref,
                  parsedSpecifier.repoUrl,
                  clonedRepoPath,
              ]
            : [
                  'clone',
                  '--depth',
                  '1',
                  parsedSpecifier.repoUrl,
                  clonedRepoPath,
              ]
        await exec({
            cmd: 'git',
            args: gitCloneArgs,
            pipe: false,
        })

        const resolvedTemplatePath = resolveSubdirectory(
            clonedRepoPath,
            parsedSpecifier.subdir,
            normalizedTemplateSource
        )
        ensureTemplateDirectory(
            resolvedTemplatePath,
            normalizedTemplateSource
        )

        return {
            templatePath: resolvedTemplatePath,
            cleanup: async () => {
                fs.removeSync(tempBase)
            },
        }
    } catch (error) {
        fs.removeSync(tempBase)
        if (error instanceof Error && error.message) {
            throw new Error(
                `Failed to resolve template "${normalizedTemplateSource}": ${error.message}`
            )
        }
        throw new Error(
            `Failed to resolve template "${normalizedTemplateSource}".`
        )
    }
}

module.exports = resolveTemplateSource
