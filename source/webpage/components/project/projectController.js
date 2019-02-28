(function () {
    'use strict';

    angular.module('vgerProject', [])
        .controller('projectController', projectController);

    projectController.$inject = ['$scope', '$location', '$rootScope', '$window', 'metricsFilterService', 'constantsService'];

    function projectController($scope, $location, $rootScope, $window, metricsFilterService, constantsService) {

        let vm = this; // view-model

        vm.teams = [];
        vm.projects = [];
        vm.getProjectList = getProjectList;
        vm.getMetrics = getMetrics;
        vm.addWebpageConstants = addWebpageConstants;
        let selectedProjectId;
        let selectedProjectName;
        getProjectList($window.sessionStorage.selectedTeamId);
        addWebpageConstants();

        // Get list of projects for the selectedTeam
        function getProjectList(id) {
            let promiseProject = metricsFilterService.getProjects(id);
            promiseProject.then(function (response) {
                sortByKey(response.data, 'name');
                vm.projects = [];
                for (let key in response.data) {
                    vm.projects.push(response.data[key]);
                }
            }).catch(function (errorResponse) {
                console.log(errorResponse);
            });
        }

        function addWebpageConstants() {
            if (!$rootScope.VGER_GUIDE) {
                constantsService.setRootScopeConstants();
            }
            let link = document.getElementById("vger_guide_link");
            link.href = $rootScope.VGER_GUIDE;

            link = document.getElementById("add_project_link");
            link.href = $rootScope.ADD_PROJECT_URL;
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
