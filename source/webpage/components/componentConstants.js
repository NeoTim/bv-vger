// component constants for webpage
(function () {
    'use strict';

    angular.module('componentConstants', [])
        .service('constantsService', constantsService);

    constantsService.$inject = ['$rootScope'];

    function constantsService($rootScope) {
        //README docs describing different metrics
        const BACKLOG_README = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/backlog_growth.md";
        const LEAD_TIMES_README = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/lead_times.md";
        const PR_GROWTH_README = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/pr_volume.md";
        const THROUGHPUT_README = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/throughput.md";
        const THROUGHPUT_VARIATION_README = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/throughput_variation.md";
        const VGER_GUIDE = "https://github.com/bazaarvoice/bv-vger/blob/master/doc/external/vger_the_complete_guide.md";
        const ADD_PROJECT_URL = "see external folder in gops-vger/docs";

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
            $rootScope.ADD_PROJECT_URL = ADD_PROJECT_URL;
        }
    }
})();
