const os = require('node:os')
const path = require('node:path')
const { exec } = require('@dhis2/cli-helpers-engine')
const fs = require('fs-extra')
const {
    isGitTemplateSpecifier,
    parseGitTemplateSpecifier,
} = require('./isGitTemplateSpecifier')
const validateTemplateDirectory = require('./validateTemplateDirectory')

const resolveExternalTemplateSource = async (templateSource) => {
    const normalizedTemplateSource = String(templateSource || '').trim()

    if (!isGitTemplateSpecifier(normalizedTemplateSource)) {
        throw new Error(
            `Unknown template "${normalizedTemplateSource}". Use one of [basic, react-router] or a GitHub template specifier like "owner/repo#ref".`
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
            : ['clone', '--depth', '1', parsedSpecifier.repoUrl, clonedRepoPath]

        await exec({
            cmd: 'git',
            args: gitCloneArgs,
            pipe: false,
        })

        validateTemplateDirectory(clonedRepoPath, normalizedTemplateSource)

        return {
            templatePath: clonedRepoPath,
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

module.exports = resolveExternalTemplateSource
