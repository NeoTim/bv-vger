import * as constants from "../../shared/constants.js"

(function () {
    'use strict';

    angular.module('vgerProject', [])
        .controller('projectController', projectController);

    projectController.$inject = ['$scope', '$location', '$rootScope', '$window', 'metricsFilterService', 'constantsService'];

    function projectController($scope, $location, $rootScope, $window, metricsFilterService, constantsService) {

        let view_model = this; // view-model

        view_model.teams = [];
        view_model.projects = [];
        view_model.getProjectList = getProjectList;
        view_model.getMetrics = getMetrics;
        view_model.addWebpageConstants = addWebpageConstants;
        let selectedProjectId;
        let selectedProjectName;
        getProjectList($window.sessionStorage.selectedTeamId);
        addWebpageConstants();

        // Get list of projects for the selectedTeam
        function getProjectList(id) {
            let promiseProject = metricsFilterService.getProjects(id);
            promiseProject.then(function (response) {
                sortByKey(response.data, 'name');
                view_model.projects = [];
                for (let key in response.data) {
                    view_model.projects.push(response.data[key]);
                }
            }).catch(function (errorResponse) {
                console.log(errorResponse);
            });
        }

        function addWebpageConstants(id) {
            if (!$rootScope.VGER_GUIDE) {
                constantsService.setRootScopeConstants();
            }
            let link = document.getElementById("vger_guide_link");
            link.href = $rootScope.VGER_GUIDE;

            link = document.getElementById("add_project_link");
            link.href = constants.API_GATEWAY_URL + '/team/' + id +'/project/';
        }

        function getMetrics(id, name) {
            selectedProjectId = id;
            selectedProjectName = name;
            $rootScope.selectedProjectId = selectedProjectId;
            $rootScope.selectedProjectName = selectedProjectName;
            $window.sessionStorage.selectedProjectId = selectedProjectId;
            $window.sessionStorage.selectedProjectName = selectedProjectName;

            $location.path('/metrics');
        }

        function sortByKey(array, key) {
            return array.sort(function (a, b) {
                let x = a[key];
                let y = b[key];
                // Format to lower case
                if (typeof x == "string") {
                    x = x.toLowerCase();
                }
                if (typeof y == "string") {
                    y = y.toLowerCase();
                }
                // Compare string
                if (x < y) {
                    return -1;
                } else if (x > y) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    }
})();
