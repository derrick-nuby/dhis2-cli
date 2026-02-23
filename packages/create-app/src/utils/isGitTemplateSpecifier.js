const githubHosts = new Set(['github.com', 'www.github.com'])
const ownerPattern = /^[a-zA-Z0-9_.-]+$/

const parseRef = (rawTemplateSource, refPart) => {
    if (refPart === undefined) {
        return null
    }
    if (!refPart) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Ref cannot be empty after "#".`
        )
    }
    if (refPart.includes(':')) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use "owner/repo" or "owner/repo#ref".`
        )
    }

    return refPart
}

const parseGithubUrlSource = (sourceWithoutRef) => {
    const parsedUrl = new URL(sourceWithoutRef)
    if (!githubHosts.has(parsedUrl.host)) {
        throw new Error(
            `Unsupported template host "${parsedUrl.host}". Only github.com repositories are supported.`
        )
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean).slice(0, 2)
    if (pathParts.length < 2) {
        throw new Error(
            `Invalid GitHub repository path in "${sourceWithoutRef}". Use "owner/repo".`
        )
    }

    return {
        owner: pathParts[0],
        repo: pathParts[1],
    }
}

const parseGithubShorthandSource = (rawTemplateSource, sourceWithoutRef) => {
    const separatorIndex = sourceWithoutRef.indexOf('/')
    const hasSingleSeparator =
        separatorIndex > 0 &&
        separatorIndex === sourceWithoutRef.lastIndexOf('/')
    if (!hasSingleSeparator) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use "owner/repo" or "owner/repo#ref".`
        )
    }

    const owner = sourceWithoutRef.slice(0, separatorIndex)
    const repo = sourceWithoutRef.slice(separatorIndex + 1)
    if (
        !ownerPattern.test(owner) ||
        !repo ||
        /\s/.test(repo) ||
        repo.includes('/')
    ) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use "owner/repo" or "owner/repo#ref".`
        )
    }

    return {
        owner,
        repo,
    }
}

const parseGitTemplateSpecifier = (templateSource) => {
    const rawTemplateSource = String(templateSource || '').trim()
    if (!rawTemplateSource) {
        throw new Error('Template source cannot be empty.')
    }

    const [sourceWithoutRef, refPart, ...rest] = rawTemplateSource.split('#')
    if (rest.length > 0) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use at most one "#" to specify a ref.`
        )
    }

    const ref = parseRef(rawTemplateSource, refPart)
    const sourceInfo = sourceWithoutRef.startsWith('https://')
        ? parseGithubUrlSource(sourceWithoutRef)
        : parseGithubShorthandSource(rawTemplateSource, sourceWithoutRef)

    const owner = sourceInfo.owner
    let repo = sourceInfo.repo

    if (repo.endsWith('.git')) {
        repo = repo.slice(0, -4)
    }

    if (!owner || !repo) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Missing GitHub owner or repository name.`
        )
    }

    return {
        owner,
        repo,
        ref,
        repoUrl: `https://github.com/${owner}/${repo}.git`,
        raw: rawTemplateSource,
    }
}

const isGitTemplateSpecifier = (templateSource) => {
    const rawTemplateSource = String(templateSource || '').trim()
    if (!rawTemplateSource) {
        return false
    }

    if (rawTemplateSource.startsWith('https://')) {
        return true
    }

    try {
        parseGitTemplateSpecifier(rawTemplateSource)
        return true
    } catch (_error) {
        return false
    }
}

module.exports = {
    isGitTemplateSpecifier,
    parseGitTemplateSpecifier,
}
