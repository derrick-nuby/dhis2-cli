const test = require('tape')
const {
    isGitTemplateSpecifier,
    parseGitTemplateSpecifier,
} = require('../src/utils/isGitTemplateSpecifier')

test('isGitTemplateSpecifier detects supported GitHub patterns', (t) => {
    t.plan(7)

    t.equal(isGitTemplateSpecifier('basic'), false, 'built-in key is not git')
    t.equal(
        isGitTemplateSpecifier('react-router'),
        false,
        'second built-in key is not git'
    )
    t.equal(
        isGitTemplateSpecifier('owner/repo'),
        true,
        'owner/repo shorthand is git'
    )
    t.equal(
        isGitTemplateSpecifier('owner/repo#main'),
        true,
        'owner/repo#ref shorthand is git'
    )
    t.equal(
        isGitTemplateSpecifier('https://github.com/owner/repo'),
        true,
        'GitHub URL is git'
    )
    t.equal(
        isGitTemplateSpecifier('owner/repo#main:templates/app'),
        false,
        'subdirectory syntax is no longer supported'
    )
    t.equal(isGitTemplateSpecifier(''), false, 'empty source is not git')
})

test('parseGitTemplateSpecifier parses shorthand with ref', (t) => {
    t.plan(5)

    const parsed = parseGitTemplateSpecifier('owner/repo#main')
    t.equal(parsed.owner, 'owner', 'owner parsed')
    t.equal(parsed.repo, 'repo', 'repo parsed')
    t.equal(parsed.ref, 'main', 'ref parsed')
    t.equal(
        parsed.repoUrl,
        'https://github.com/owner/repo.git',
        'repo URL normalized'
    )
    t.equal(parsed.raw, 'owner/repo#main', 'raw source preserved')
})

test('parseGitTemplateSpecifier parses URL and strips .git suffix', (t) => {
    t.plan(4)

    const parsed = parseGitTemplateSpecifier(
        'https://github.com/acme/template.git#release'
    )
    t.equal(parsed.owner, 'acme', 'owner parsed from URL')
    t.equal(parsed.repo, 'template', 'repo parsed and .git removed')
    t.equal(parsed.ref, 'release', 'ref parsed from URL')
    t.equal(parsed.raw, 'https://github.com/acme/template.git#release', 'raw')
})

test('parseGitTemplateSpecifier rejects unsupported or malformed inputs', (t) => {
    t.plan(4)

    t.throws(
        () => parseGitTemplateSpecifier('owner-only'),
        /Invalid template source/,
        'rejects malformed shorthand'
    )
    t.throws(
        () => parseGitTemplateSpecifier('https://gitlab.com/acme/repo'),
        /Only github.com repositories are supported|Unsupported template host/,
        'rejects non-GitHub host'
    )
    t.throws(
        () => parseGitTemplateSpecifier('owner/repo#'),
        /Ref cannot be empty/,
        'rejects empty ref'
    )
    t.throws(
        () => parseGitTemplateSpecifier('owner/repo#main:templates/app'),
        /Invalid template source/,
        'rejects subdirectory syntax'
    )
})
