const githubHosts = new Set(['github.com', 'www.github.com'])
const shorthandPattern = /^([a-zA-Z0-9_.-]+)\/([^\s/]+)$/

const parseRefAndSubdir = (rawTemplateSource, refAndSubdir) => {
    if (refAndSubdir === undefined) {
        return { ref: null, subdir: null }
    }
    if (!refAndSubdir) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Ref cannot be empty after "#".`
        )
    }

    const [parsedRef, ...subdirParts] = refAndSubdir.split(':')
    const ref = parsedRef || null
    const subdir = subdirParts.length > 0 ? subdirParts.join(':') : null

    if (!ref) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Ref cannot be empty after "#".`
        )
    }
    if (subdir !== null && !subdir.trim()) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Subdirectory cannot be empty after ":".`
        )
    }

    return { ref, subdir }
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
    const match = sourceWithoutRef.match(shorthandPattern)
    if (!match) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use "owner/repo", "owner/repo#ref", or "owner/repo#ref:subdir".`
        )
    }

    return {
        owner: match[1],
        repo: match[2],
    }
}

const parseGitTemplateSpecifier = (templateSource) => {
    const rawTemplateSource = String(templateSource || '').trim()
    if (!rawTemplateSource) {
        throw new Error('Template source cannot be empty.')
    }

    const [sourceWithoutRef, refAndSubdir, ...rest] =
        rawTemplateSource.split('#')
    if (rest.length > 0) {
        throw new Error(
            `Invalid template source "${rawTemplateSource}". Use at most one "#" to specify a ref.`
        )
    }

    const { ref, subdir } = parseRefAndSubdir(rawTemplateSource, refAndSubdir)
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
        subdir,
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

    return /^[a-zA-Z0-9_.-]+\/[^\s/]+(?:#.+)?$/.test(rawTemplateSource)
}

module.exports = {
    isGitTemplateSpecifier,
    parseGitTemplateSpecifier,
}
