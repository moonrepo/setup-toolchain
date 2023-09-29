import fs from 'node:fs';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import { getPluginsDir, getToolchainCacheKey, getToolsDir } from './helpers';

async function saveCache() {
	if (!cache.isFeatureAvailable()) {
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

		core.info(`Saving cache with key ${primaryKey}`);

		await cache.saveCache([getPluginsDir(), toolsDir], primaryKey, {}, false);
	} catch (error: unknown) {
		core.setFailed(error as Error);
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void saveCache();
