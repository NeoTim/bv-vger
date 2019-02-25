/*
 * Service to handle API requests made from metricsController
 */

import * as constants from "../../shared/constants.js"

(function () {
    'use strict';

    angular.module('vgerMetricsService', [])
        .service('metricsFilterService', metricsFilterService)
        .service('metricsDataService', metricsDataService);

    // Retrieves data for charts
    metricsDataService.$inject = ['$http', '$rootScope'];

    function metricsDataService($http, $rootScope) {
        return {
            getWorkStates: getWorkStates,
            getBoardID: getBoardID,
            getJiraIssueConfiguration: getJiraIssueConfiguration,
            getLeadTimeData: getLeadTimeData,
            getThroughputStatisticsData: getThroughputStatisticsData,
            getThroughputHistoryData: getThroughputHistoryData,
            getThroughputGitRepoData: getThroughputGitRepoData,
            getThroughputGitTagData: getThroughputGitTagData,
            getVelocityData: getVelocityData,
            getPredictabilityData: getPredictabilityData,
            getPRHistoryData: getPRHistoryData,
            getPRStatisticsData: getPRStatisticsData,
            getPRPredictabilityData: getPRPredictabilityData,
            getPRLeadtimeData: getPRLeadtimeData,
            getPRBacklogData: getPRBacklogData
        };

        function getWorkStates(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workStatesAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/' + 'workstates?';
            return $http({
                method: 'GET',
                url: encodeURI(workStatesAPIStr)
            });
        }

        //  Get board ID to open JIRA board in new tab upon user request
        function getBoardID(boardName) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/board/id/?boardName=' + boardName)
            });
        }

        // Return detailed jira issue information 
        function getJiraIssueConfiguration(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/issues')
            });
        }

        function getLeadTimeData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workTypeStr = selectedWorkTypes.join();
            let leadTimeAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/leadtime?';

            if (workTypeStr !== '') leadTimeAPIStr += '&workTypes=' + workTypeStr;
            if (days) leadTimeAPIStr += '&days=' + days;
            if (dateSince) leadTimeAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) leadTimeAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(leadTimeAPIStr)
            });
        }

        function getThroughputStatisticsData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workTypeStr = selectedWorkTypes.join();
            let statisticsStr = 'statistics';
            let statisticsAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/throughput/' + statisticsStr + '?';

            if (workTypeStr !== '') statisticsAPIStr += '&workTypes=' + workTypeStr;
            if (days) statisticsAPIStr += '&days=' + days;
            if (dateSince) statisticsAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) statisticsAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(statisticsAPIStr)
            });
        }

        function getThroughputHistoryData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workTypeStr = selectedWorkTypes.join();
            let historyStr = 'history';
            let historyAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/throughput/' + historyStr + '?';

            if (workTypeStr !== '') historyAPIStr += '&workTypes=' + workTypeStr;
            if (days) historyAPIStr += '&days=' + days;
            if (dateSince) historyAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) historyAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(historyAPIStr)
            });
        }

        function getThroughputGitRepoData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let gitRepoAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/repos?';
            return $http({
                method: 'GET',
                url: encodeURI(gitRepoAPIStr)
            });
        }

        function getThroughputGitTagData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let gitTagAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/tags?';

            if (days) gitTagAPIStr += '&days=' + days;
            if (dateSince) gitTagAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) gitTagAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(gitTagAPIStr)
            });
        }

        function getVelocityData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workTypeStr = selectedWorkTypes.join();
            let backlogHistoryAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/backlog/?';

            if (workTypeStr !== '') backlogHistoryAPIStr += '&workTypes=' + workTypeStr;
            if (days) backlogHistoryAPIStr += '&days=' + days;
            if (dateSince) backlogHistoryAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) backlogHistoryAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(backlogHistoryAPIStr)
            });
        }

        function getPredictabilityData(selectedWorkTypes, selectedProjectId, days, dateSince, dateUntil) {
            let workTypeStr = selectedWorkTypes.join();
            let predictabilityAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/throughput/predictability?';

            if (workTypeStr !== '') predictabilityAPIStr += '&workTypes=' + workTypeStr;
            if (days) predictabilityAPIStr += '&days=' + days;
            if (dateSince) predictabilityAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) predictabilityAPIStr += '&dateUntil=' + dateUntil;

            return $http({
                method: 'GET',
                url: encodeURI(predictabilityAPIStr)
            });
        }

        function getPRHistoryData(repoNameList, selectedProjectId, days, dateSince, dateUntil) {
            let historyStr = 'history';
            let historyAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/prs/throughput/' + historyStr + '?';

            if (days) historyAPIStr += '&days=' + days;
            if (dateSince) historyAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) historyAPIStr += '&dateUntil=' + dateUntil;
            if (repoNameList) historyAPIStr += '&repoName=' + repoNameList.join();

            return $http({
                method: 'GET',
                url: encodeURI(historyAPIStr)
            });
        }

        function getPRStatisticsData(repoNameList, selectedProjectId, days, dateSince, dateUntil) {
            let statisticsStr = 'statistics';
            let statisticsAPIStr = constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/prs/throughput/' + statisticsStr + '?';

            if (days) statisticsAPIStr += '&days=' + days;
            if (dateSince) statisticsAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) statisticsAPIStr += '&dateUntil=' + dateUntil;
            if (repoNameList) statisticsAPIStr += '&repoName=' + repoNameList.join();

            return $http({
                method: 'GET',
                url: encodeURI(statisticsAPIStr)
            });
        }

        function getPRPredictabilityData(repoNameList, selectedProjectId, days, dateSince, dateUntil) {
            let predictabilityStr = 'predictability';
            let predictabilityAPIStr =
                constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/prs/throughput/' + predictabilityStr + '?';

            if (days) predictabilityAPIStr += '&days=' + days;
            if (dateSince) predictabilityAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) predictabilityAPIStr += '&dateUntil=' + dateUntil;
            if (repoNameList) predictabilityAPIStr += '&repoName=' + repoNameList.join();

            return $http({
                method: 'GET',
                url: encodeURI(predictabilityAPIStr)
            });
        }

        function getPRLeadtimeData(repoNameList, selectedProjectId, days, dateSince, dateUntil) {
            let leadtimeStr = 'leadtime';
            let leadtimeAPIStr =
                constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/prs/' + leadtimeStr + "?";

            if (days) leadtimeAPIStr += '&days=' + days;
            if (dateSince) leadtimeAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) leadtimeAPIStr += '&dateUntil=' + dateUntil;
            if (repoNameList) leadtimeAPIStr += '&repoName=' + repoNameList.join();

            return $http({
                method: 'GET',
                url: encodeURI(leadtimeAPIStr)
            });
        }

        function getPRBacklogData(repoNameList, selectedProjectId, days, dateSince, dateUntil) {
            let backlogStr = 'backlog';
            let backlogAPIStr =
                constants.API_GATEWAY_URL + '/project/' + selectedProjectId + '/prs/' + backlogStr + "?";

            if (days) backlogAPIStr += '&days=' + days;
            if (dateSince) backlogAPIStr += '&dateSince=' + dateSince;
            if (dateUntil) backlogAPIStr += '&dateUntil=' + dateUntil;
            if (repoNameList) backlogAPIStr += '&repoName=' + repoNameList.join();

            return $http({
                method: 'GET',
                url: encodeURI(backlogAPIStr)
            });
        }
    }

    // Handles form input and retrieves info from AWS API gateway
    metricsFilterService.$inject = ['$http'];

    function metricsFilterService($http) {
        return {
            getTeams: getTeams,
            getAvailableTeams: getAvailableTeams,
            getProjects: getProjects,
            getWorkTypes: getWorkTypes,
        };

        // Return list of teams
        // lambda function: /source/statistics/team.py
        function getTeams() {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/')
            });
        }

        function getAvailableTeams() {
            return $http({
                method: 'GET',
                url: $rootScope.TEAM_LIST_API_ENDPOINT
            });
        }

        // Return list of projects
        // lambda function: /source/statistics/project.py
        function getProjects(teamId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/team/' + teamId + '/' + 'project/')
            });
        }

        // Return list of worktypes
        // lambda function: /source/statistics/projectWorkTypes.py
        function getWorkTypes(projectId) {
            return $http({
                method: 'GET',
                url: encodeURI(constants.API_GATEWAY_URL + '/project/' + projectId + '/worktypes/')
            });
        }
    }
})();
