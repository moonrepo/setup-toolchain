import fs from 'node:fs';
import path from 'node:path';
import execa from 'execa';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {
	getBinDir,
	getPluginsDir,
	getToolchainCacheKey,
	getToolsDir,
	getWorkingDir,
	installBin,
	isUsingMoon,
} from './helpers';

async function restoreCache() {
	if (!cache.isFeatureAvailable()) {
		return;
	}

	core.info('Attempting to restore cached toolchain');

	const primaryKey = await getToolchainCacheKey();
	const cacheKey = await cache.restoreCache(
		[getPluginsDir(), getToolsDir()],
		primaryKey,
		[`moonrepo-toolchain-${process.platform}`, 'moonrepo-toolchain'],
		{},
		false,
	);

	if (cacheKey) {
		core.saveState('cacheHitKey', cacheKey);
		core.info(`Toolchain cache restored using key ${primaryKey}`);
	} else {
		core.info(`Toolchain cache does not exist using key ${primaryKey}`);
	}

	core.setOutput('cache-key', cacheKey ?? primaryKey);
	core.setOutput('cache-hit', !!cacheKey);
}

async function run() {
	try {
		core.addPath(getBinDir());

		await restoreCache();
		await installBin('proto');

		if (isUsingMoon()) {
			await installBin('moon');
		}

		if (
			core.getBooleanInput('auto-install') &&
			fs.existsSync(path.join(getWorkingDir(), '.prototools'))
		) {
			core.info('Attempting to restore cached toolchain');

			await execa('proto', ['use']);
		}
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run();
