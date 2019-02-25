/*
 * Service to handle API requests made from configurationsController
 * Create, update, retrieve configuration info from db
 */

import * as constants from '../../shared/constants.js';

(function () {
    'use strict';

    angular.module('vgerConfigurationsService', [])
        .service('configurationsService', configurationsService);

    configurationsService.$inject = ['$http'];

    function configurationsService($http) {
        return {
            getTeams: getTeams,
            getProjects: getProjects,
            getJiraIssueConfiguration: getJiraIssueConfiguration,
            getJiraWorkTypesConfiguration: getJiraWorkTypesConfiguration,
            getJiraWorkStatesConfiguration: getJiraWorkStatesConfiguration,
            getBoardWorkStatesConfiguration: getBoardWorkStatesConfiguration,
            getGitConfiguration: getGitConfiguration,
            getIssueFilter: getIssueFilter,
            getBoardJQL: getBoardJQL,
            createTeam: createTeam,
            createProject: createProject,
            updateIssues: updateIssues,
            updateRepos: updateRepos,
            updateWorkTypes: updateWorkTypes,
            updateWorkStates: updateWorkStates,
            projectETL: projectETL,
            etlStatus: etlStatus
        };

        // Return list of teams
        function getTeams() {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/')
            });
        }

        // Return list of projects belonging to the team
        function getProjects(teamId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/' + teamId + '/project/')
            });
        }

        // Return detailed jira issue information 
        function getJiraIssueConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/issues')
            });
        }

        // Return list of work types
        function getJiraWorkTypesConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/worktypes')
            });
        }

        // Return list of status and state names
        function getJiraWorkStatesConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/workstates')
            });
        }

        // Return list of status and state names from Kanaban board
        function getBoardWorkStatesConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/boardworkstates')
            });
        }

        // Return list of git repositories
        function getGitConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/repos')
            });
        }

        // Return filtered JQL and indices that requires warning
        function getIssueFilter(jql) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/issues/filter?jql=' + jql)
            });
        }

        // Return latest JQL given JIRA board name
        function getBoardJQL(board_name) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/board?boardName=' + board_name)
            });
        }

        // Create a new team
        function createTeam(teamName) {
            return $http({
                method: 'POST',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/'),
                data: {
                    name: teamName
                }
            });
        }

        // Create a new project
        function createProject(teamId, projectName, boardName, issueKeys, repoNames) {
            return $http({
                method: 'POST',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/' + teamId + '/project'),
                data: {
                    name: projectName,
                    issues: {
                        issueKeys: issueKeys,
                        boardName: boardName
                    },
                    repoNames: repoNames
                }
            });
        }

        // Update project issues
        function updateIssues(projectId, boardName, includeSubtasks, excludedIssueTypes, issueFilter, projectName) {
            return $http({
                method: 'PUT',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/issues'),
                data: {
                    boardName: boardName,
                    includeSubtasks: includeSubtasks,
                    excludedIssueTypes: excludedIssueTypes,
                    issueFilter: issueFilter,
                    projectName: projectName
                }
            });
        }

        function updateRepos(projectId, repos) {
            return $http({
                method: 'PUT',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/repos'),
                data: repos
            });
        }

        // Update Work Types
        function updateWorkTypes(projectId, workTypePostBody) {
            return $http({
                method: 'PUT',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/worktypes'),
                data: workTypePostBody
            });
        }

        // Update Work States
        function updateWorkStates(projectId, workStatePostBody) {
            return $http({
                method: 'PUT',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/workstates'),
                data: workStatePostBody
            });
        }

        // Trigger ETL
        function projectETL(selectedProjectId, issue_type_etl) {
            let APIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/etl';
            if (issue_type_etl) {
                APIStr += "?issuetype=true";
            }
            return $http({
                method: 'POST',
                url: encodeURI(APIStr)
            });
        }

        // Get ETL status for specific project
        function etlStatus(selectedProjectId) {
            let APIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/etl/status';
            return $http({
                method: 'GET',
                url: encodeURI(APIStr)
            });
        }
    }
})();
