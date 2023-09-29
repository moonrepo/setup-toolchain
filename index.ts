import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {
	getBinDir,
	getPluginsDir,
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
		await restoreCache();
		await installBin('proto', 'proto-version');

		if (isUsingMoon()) {
			await installBin('moon', 'moon-version');
		}

		core.addPath(getBinDir());
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run();
