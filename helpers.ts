import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import execa from 'execa';
import yaml from 'yaml';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as tc from '@actions/tool-cache';

export const WINDOWS = process.platform === 'win32';

export function getProtoHome() {
	if (process.env.PROTO_HOME) {
		return process.env.PROTO_HOME;
	}

	if (process.env.PROTO_ROOT) {
		return process.env.PROTO_ROOT;
	}

	return path.join(os.homedir(), '.proto');
}

export function getMoonHome() {
	return path.join(os.homedir(), '.moon');
}

export function getMoonBinDir() {
	return path.join(getMoonHome(), 'bin');
}

export function getBinDir() {
	return path.join(getProtoHome(), 'bin');
}

export function getPluginsDir() {
	return path.join(getProtoHome(), 'plugins');
}

export function getShimsDir() {
	return path.join(getProtoHome(), 'shims');
}

export function getToolsDir() {
	return path.join(getProtoHome(), 'tools');
}

export function getUidFile() {
	return path.join(getProtoHome(), 'id');
}

export function getWorkingDir() {
	return process.env.GITHUB_WORKSPACE ?? process.cwd();
}

export function getWorkspaceRoot() {
	return path.join(getWorkingDir(), core.getInput('workspace-root'));
}

export function isCacheEnabled() {
	return core.getBooleanInput('cache') && cache.isFeatureAvailable();
}

export function isUsingMoon() {
	return !!core.getInput('moon-version') || fs.existsSync(path.join(getWorkspaceRoot(), '.moon'));
}

export function shouldInstallMoon() {
	// Not installing with proto, so need to install with the action
	if (!core.getBooleanInput('auto-install')) {
		return true;
	}

	const prototools = path.join(getWorkspaceRoot(), '.prototools');

	if (fs.existsSync(prototools)) {
		const lines = fs.readFileSync(prototools, 'utf8').split('\n');

		for (const line of lines) {
			// If we encountered a table, then we are out of the versions mapping
			if (line.startsWith('[')) {
				break;
			}

			// If we find a `moon = "1.2.3"` version string, then we shouldn't install
			// moon with the action, and instead install through proto
			if (line.match(/^moon(\s*)=(\s*)('|")/)) {
				return false;
			}
		}
	}

	return true;
}

export function extractMajorMinor(version: string) {
	const [major, minor] = version.split('.');

	return `${major}.${minor}`;
}

export function getCacheKeyPrefix() {
	// v2 - Before proto v0.24 changes
	// v3 - proto v0.51 lockfile changes
	return 'moonrepo-toolchain-v3';
}

export async function getToolchainCacheKey() {
	const hasher = crypto.createHash('sha1');
	const files = ['.prototools', '.protolock'];

	if (isUsingMoon()) {
		const root = core.getInput('workspace-root');

		if (root) {
			files.push(
				path.join(root, '.prototools'),
				path.join(root, '.protolock'),
				path.join(root, '.moon/toolchain.yml'),
			);
		} else {
			files.push('.moon/toolchain.yml');
		}
	}

	core.debug(`Hashing files: ${files.join(', ')}`);

	hasher.update(await glob.hashFiles(files.join('\n')));

	const protoVersion = process.env.PROTO_CLI_VERSION ?? core.getState('PROTO_CLI_VERSION');

	if (protoVersion) {
		core.debug(`Hashing proto version: ${protoVersion}`);

		hasher.update(extractMajorMinor(protoVersion));
	}

	const moonVersion = process.env.MOON_CLI_VERSION ?? core.getState('MOON_CLI_VERSION');

	if (moonVersion) {
		core.debug(`Hashing moon version: ${moonVersion}`);

		hasher.update(extractMajorMinor(moonVersion));
	}

	const configVersion = core.getInput('cache-version');

	if (configVersion) {
		core.debug(`Hashing configured version: ${configVersion}`);

		hasher.update(configVersion);
	}

	return `${getCacheKeyPrefix()}-${process.platform}-${process.arch}-${hasher.digest('hex')}`;
}

function getProtoVersion(): string {
	const version = core.getInput('proto-version');

	if (version) {
		return version;
	}

	if (isUsingMoon()) {
		const toolchainPath = path.join(getWorkspaceRoot(), '.moon/toolchain.yml');

		if (fs.existsSync(toolchainPath)) {
			const toolchain = yaml.parse(fs.readFileSync(toolchainPath, 'utf8')) as {
				proto?: { version?: string };
			};
			const protoVersion = toolchain.proto?.version;

			// Only fully-qualified is allowed
			if (protoVersion && typeof protoVersion === 'string' && protoVersion.split('.').length >= 3) {
				return protoVersion;
			}
		}
	}

	return 'latest';
}

function getMoonVersion(): string {
	return core.getInput('moon-version') || 'latest';
}

function getMoonIsV2OrHigher(): boolean {
	return parseInt(getMoonVersion().split('.')[0]) > 1
}

export async function installBin(bin: string) {
	core.info(`Installing \`${bin}\` globally`);

	const version =
		// eslint-disable-next-line no-nested-ternary
		bin === 'proto' ? getProtoVersion() : bin === 'moon' ? getMoonVersion() : 'latest';

	const scriptName = WINDOWS ? `${bin}.ps1` : `${bin}.sh`;
	const scriptPath = path.join(getProtoHome(), 'temp', scriptName);

	// If the installer already exists, delete it and ensure were using the latest
	if (fs.existsSync(scriptPath)) {
		fs.unlinkSync(scriptPath);
	}

	core.info('Downloading installation script');

	const script = await tc.downloadTool(`https://moonrepo.dev/install/${scriptName}`, scriptPath);

	// eslint-disable-next-line no-magic-numbers
	await fs.promises.chmod(script, 0o755);

	core.info(`Downloaded script to ${script}`);

	core.info('Executing installation script');

	const useMoonBinDir = bin === 'moon' && getMoonIsV2OrHigher();
	const binDir = useMoonBinDir ? getMoonBinDir() : getBinDir() ;
	
	const binPath = path.join(binDir, WINDOWS ? `${bin}.exe` : bin);
	const envPrefix = bin.toUpperCase();

	await execa(script, version === 'latest' ? [] : [version], {
		env: {
			[`${envPrefix}_INSTALL_DIR`]: binDir,
		},
		stdio: core.isDebug() || !!process.env[`${envPrefix}_DEBUG`] ? 'inherit' : 'pipe',
	});

	core.info(`Installed binary to ${binPath}`);

	core.info('Checking version');

	try {
		const result = await execa(binPath, ['--version'], { stdio: 'pipe' });

		if (result.stdout) {
			const v = result.stdout.replace(bin, '').trim();

			// eslint-disable-next-line require-atomic-updates
			process.env[`${envPrefix}_CLI_VERSION`] = v;
			core.saveState(`${envPrefix}_CLI_VERSION`, v);

			core.info(result.stdout);
		}
	} catch (error) {
		core.error(String(error));
	}
}
