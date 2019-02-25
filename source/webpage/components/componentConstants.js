// component constants for webpage
(function () {
    'use strict';

    angular.module('componentConstants', [])
        .service('constantsService', constantsService);

    constantsService.$inject = ['$rootScope'];

    function constantsService($rootScope) {
        //Local README docs describing different metrics
        const BACKLOG_README = "<PROJECT_HOME>/doc/external/backlog_growth.md";
        const LEAD_TIMES_README = "<PROJECT_HOME>/doc/external/lead_times.md";
        const PR_GROWTH_README = "<PROJECT_HOME>/doc/external/pr_volume.md";
        const THROUGHPUT_README = "<PROJECT_HOME>/doc/external/throughput.md";
        const THROUGHPUT_VARIATION_README = "<PROJECT_HOME>/doc/external/throughput_variation.md";
        const VGER_GUIDE = "<PROJECT_HOME>/doc/external/vger_the_complete_guide.md";

        const JIRA_SUPPORT_PROJECT_URL = '';
        const BOARD_ID_URL = 'JIRA_URL?rapidView=';
        const ADD_PROJECT_URL = "see external folder in gops-vger/docs";
        const TEAM_LIST_API_ENDPOINT = 'API ENDPOINT WITH LIST OF TEAM NAMES';

        return {
            setRootScopeConstants: setRootScopeConstants,
        };

        function setRootScopeConstants() {
            $rootScope.BACKLOG_README = BACKLOG_README;
            $rootScope.LEADTIMES_README = LEAD_TIMES_README;
            $rootScope.PR_GROWTH_README = PR_GROWTH_README;
            $rootScope.THROUGHPUT_README = THROUGHPUT_README;
            $rootScope.THROUGHPUT_VARIATION_README = THROUGHPUT_VARIATION_README;
            $rootScope.VGER_GUIDE = VGER_GUIDE;
            $rootScope.JIRA_SUPPORT_PROJECT_URL = JIRA_SUPPORT_PROJECT_URL;
            $rootScope.BOARD_ID_URL = BOARD_ID_URL;
            $rootScope.ADD_PROJECT_URL = ADD_PROJECT_URL;
            $rootScope.TEAM_LIST_API_ENDPOINT = TEAM_LIST_API_ENDPOINT;
        }
    }
})();
