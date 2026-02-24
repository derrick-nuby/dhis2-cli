const os = require('node:os')
const path = require('node:path')
const fs = require('fs-extra')
const test = require('tape')
const resolveExternalTemplateSource = require('../src/utils/resolveExternalTemplateSource')
const validateTemplateDirectory = require('../src/utils/validateTemplateDirectory')

const createTempTemplate = () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2-create-test-'))
    fs.writeJsonSync(path.join(tempDir, 'package.json'), { name: 'fixture' })
    return tempDir
}

test('validateTemplateDirectory accepts valid template directory', (t) => {
    const tempDir = createTempTemplate()
    t.plan(1)

    try {
        validateTemplateDirectory(tempDir, 'test-source')
        t.pass('valid directory passes')
    } finally {
        fs.removeSync(tempDir)
    }
})

test('resolveExternalTemplateSource fails for unknown non-git templates', async (t) => {
    t.plan(1)

    try {
        await resolveExternalTemplateSource('unknown-template')
        t.fail('should fail')
    } catch (error) {
        t.match(
            String(error.message || error),
            /Unknown template/,
            'returns unknown-template error'
        )
    }
})

test('resolveExternalTemplateSource fails fast for unsupported git hosts', async (t) => {
    t.plan(1)

    try {
        await resolveExternalTemplateSource('https://gitlab.com/acme/repo')
        t.fail('should fail')
    } catch (error) {
        t.match(
            String(error.message || error),
            /Unsupported template host|Only github.com repositories are supported/,
            'rejects unsupported host before clone'
        )
    }
})

test('resolveExternalTemplateSource rejects subdirectory syntax', async (t) => {
    t.plan(1)

    try {
        await resolveExternalTemplateSource('owner/repo#main:templates/app')
        t.fail('should fail')
    } catch (error) {
        t.match(
            String(error.message || error),
            /Unknown template|Invalid template source/,
            'subdirectory syntax is rejected'
        )
    }
})
