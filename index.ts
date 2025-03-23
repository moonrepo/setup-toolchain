import execa from 'execa';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {
	getBinDir,
	getCacheKeyPrefix,
	getPluginsDir,
	getShimsDir,
	getToolchainCacheKey,
	getToolsDir,
	getUidFile,
	getWorkspaceRoot,
	installBin,
	isCacheEnabled,
	isUsingMoon,
	shouldInstallMoon,
} from './helpers';

async function restoreCache() {
	if (!isCacheEnabled()) {
		return;
	}

	core.info('Attempting to restore cached toolchain');

	const primaryKey = await getToolchainCacheKey();
	const cachePrefix = getCacheKeyPrefix();

	const cacheKey = await cache.restoreCache(
		[getPluginsDir(), getToolsDir(), getUidFile()],
		primaryKey,
		[`${cachePrefix}-${process.platform}-${process.arch}`, cachePrefix],
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

		await installBin('proto');

		if (isUsingMoon() && shouldInstallMoon()) {
			await installBin('moon');
		}

		await restoreCache();

		if (core.getBooleanInput('auto-install')) {
			core.info('Auto-installing tools');

			await execa('proto', ['use'], { cwd: getWorkspaceRoot(), stdio: 'inherit' });
		}
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run();
