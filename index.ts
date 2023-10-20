import execa from 'execa';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {
	getBinDir,
	getPluginsDir,
	getShimsDir,
	getToolchainCacheKey,
	getToolsDir,
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
		const shimsDir = getShimsDir();
		const binDir = getBinDir();

		core.info(`Added ${shimsDir} and ${binDir} to PATH`);
		core.addPath(binDir);
		core.addPath(shimsDir);

		await restoreCache();

		await installBin('proto');

		if (isUsingMoon()) {
			await installBin('moon');
		}

		if (core.getBooleanInput('auto-install')) {
			core.info('Auto-installing tools');

			await execa('proto', ['use'], { stdio: 'inherit' });
		}
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run();
