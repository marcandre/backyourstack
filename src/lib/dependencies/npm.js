import debug from 'debug';

import cache from '../cache';

import { fetchFileFromRepo, searchFilesFromProfile } from '../github';

const _debug = debug('dependencies:npm');

const dependencyTypes = {
  core: 'dependencies',
  peer: 'peerDependencies',
  dev: 'devDependencies',
  engines: 'engines',
};

function dependenciesStats (packageJson) {
  const dependencies = {};
  Object.entries(dependencyTypes).forEach(([ dependencyType, dependencyKey ]) => {
    if (packageJson[dependencyKey]) {
      Object.keys(packageJson[dependencyKey]).forEach(name => {
        dependencies[name] = dependencies[name] || { type: 'npm', name };
        dependencies[name][dependencyType] = 1;
      });
    }
  });
  return Object.values(dependencies);
}

function getDependenciesFromGithubRepo (githubRepo, githubAccessToken) {
  return getDependenciesFromGithubRepoFile(githubRepo, 'package.json', githubAccessToken);
}

function getDependenciesFromGithubRepoFile (githubRepo, path, githubAccessToken) {
  const cacheKey = `repo_npm_dependencies_${githubRepo.id}_${path}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  return fetchFileFromRepo(githubRepo, path, githubAccessToken)
    .then(JSON.parse)
    .then(dependenciesStats)
    .catch(err => {
      _debug(`getDependenciesFromGithubRepo error: ${err.message}`);
      return [];
    })
    .then(result => {
      cache.set(cacheKey, result);
      return result;
    });
}

function getDependenciesFromGithubProfile (githubProfile, githubAccessToken) {

  return searchFilesFromProfile(githubProfile, 'package.json', githubAccessToken)
    .then(
      files => Promise.all(files.map(async file => {
        file.repo.dependencies = await getDependenciesFromGithubRepoFile(file.repo, file.path, githubAccessToken);
        return file.repo;
      }))
    );
}

export {
  getDependenciesFromGithubRepo,
  getDependenciesFromGithubProfile,
  dependenciesStats,
};
