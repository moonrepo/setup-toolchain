import fs from 'node:fs';
import execa from 'execa';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import { getPluginsDir, getToolchainCacheKey, getToolsDir, isCacheEnabled } from './helpers';

async function cleanToolchain() {
	try {
		core.info(`Cleaning toolchain of stale items before caching`);

		await execa('proto', ['clean', '--yes']);
	} catch (error: unknown) {
		core.warning(error as Error);
	}
}

function shouldSaveCache() {
	const base = core.getInput('cache-base');

	// Only save the cache for the following 2 scenarios:
	//	- If not using the base warmup strategy.
	//	- If using the base warmup strategy, and the current ref matches.
	return !base || !!(base && !!(process.env.GITHUB_REF_NAME ?? '').match(base));
}

async function saveCache() {
	if (!isCacheEnabled() || !shouldSaveCache()) {
		return;
	}

	const toolsDir = getToolsDir();

	if (!fs.existsSync(toolsDir)) {
		core.info(`Toolchain does not exist, not saving cache`);
		return;
	}

	try {
		const primaryKey = await getToolchainCacheKey();
		const cacheHitKey = core.getState('cacheHitKey');

		if (cacheHitKey === primaryKey) {
			core.info(`Cache hit occured on the key ${cacheHitKey}, not saving cache`);
			return;
		}

		await cleanToolchain();

		core.info(`Saving cache with key ${primaryKey}`);

		await cache.saveCache([getPluginsDir(), toolsDir], primaryKey, {}, false);
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void saveCache();
