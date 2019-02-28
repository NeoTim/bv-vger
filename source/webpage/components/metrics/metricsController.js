/*
 *  Controller for the metrics page
 *  Handles input forms and rendering google chart
 */

import * as constants from "../../shared/constants.js"

(function () {
    'use strict';

    angular.module('vgerMetricsController', [])
        .controller('metricsController', metricsController);

    metricsController.$inject = ['$scope', '$q', '$location', '$controller', '$rootScope', '$window',
        '$mdDialog', 'metricsFilterService', 'metricsDataService', 'dateService', 'constantsService', 'googleChartApiPromise', '$mdToast'];

    function metricsController($scope, $q, $location, $controller, $rootScope, $window,
                               $mdDialog, metricsFilterService, metricsDataService, dateService, constantsService, googleChartApiPromise, $mdToast) {
        let view_model = this; // view-model

        view_model.teams = [];
        view_model.projects = [];
        view_model.workTypes = [];
        view_model.selectedTeam = {};
        view_model.selectedProject = {};
        view_model.selectedWorkTypes = [];
        view_model.graphError = view_model.showTags = view_model.submitted = view_model.workTypeError = view_model.editingWorkTypes = view_model.editingWorkStates = view_model.editingProject = view_model.serverError = false;
        view_model.throughputGraph = view_model.velocityGraph = {};
        view_model.throughputGraphBuilt = view_model.velocityGraphBuilt = view_model.leadTimeGraphBuilt = view_model.predictabilityGraphBuilt = false;
        view_model.viewMode = "issue";

        view_model.filter = filter;
        view_model.hideTPSeries = hideTPSeries;
        view_model.hideLTSeries = hideLTSeries;
        view_model.changePercentileCurve = changePercentileCurve;
        view_model.toggleGitTags = toggleGitTags;
        view_model.leadTimePercentileChange = leadTimePercentileChange;
        view_model.changeVelocityCurve = changeVelocityCurve;
        view_model.showLeadTimeTrends = showLeadTimeTrends;
        view_model.leadTimeModeChange = leadTimeModeChange;
        view_model.projectSettingsModal = projectSettingsModal;
        view_model.openMenu = openMenu;
        view_model.getBoardID = getBoardID;
        view_model.addWebpageConstants = addWebpageConstants;
        view_model.updateWebpageConstants = updateWebpageConstants;
        view_model.buildNewURL = buildNewURL;
        view_model.changeSelectedWorkTypes = changeSelectedWorkTypes;
        view_model.workStatesSettingsModal = workStatesSettingsModal;
        view_model.workTypesSettingsModal = workTypesSettingsModal;
        view_model.viewModeChange = viewModeChange;
        view_model.downloadThroughput = downloadThroughput;
        view_model.projectETL = projectETL;
        view_model.issueTypeETL = issueTypeETL;
        view_model.hasGitRepo = false;
        view_model.hasGitTag = false;
        view_model.hamburgerMenuOpened = false;
        view_model.fileName = "";

        let dateSince, dateUntil, days;
        let isPointsStraight = false;
        let curvedDataPoints = [], straightDataPoints = [];
        let throughputData = [], velocityData = [], predictabilityData = [], leadTimeData = {}, gitData = {};
        let throughputTickets = [];
        let absoluteBacklogHistory = [], relativeBacklogHistory = [];
        let backlogSeries = [];
        let leadTimeStages = [];
        let throughputLabels = [], velocityLabels = [], predictabilityLabels = [], leadTimeLabels = [];

        // Open project settings when first redirected from creating a new team project
        let newTeamProject = $location.search().newTeamProject;
        if (newTeamProject) {
            view_model.projectSettingsModal();
        }

        // Save scope between configuration and metrics page
        getSessionScope();
        getWorkTypes(filter);

        //initial function calls needed to build quarterly reports URL info
        getBoardID();

        function getSessionScope() {
            // Check bookmarked query params
            let queryParams = $location.search();
            view_model.selectedTeam.id = queryParams['teamId'];
            view_model.selectedProject.id = queryParams['projectId'];
            view_model.selectedTeam.name = queryParams['teamName'];
            view_model.selectedProject.name = queryParams['projectName'];

            if (view_model.selectedProject.id && !$window.sessionStorage.selectedProjectId) {
                $rootScope.selectedTeamId = view_model.selectedTeam.id;
                $rootScope.selectedTeamName = view_model.selectedTeam.name;
                $window.sessionStorage.selectedTeamId = view_model.selectedTeam.id;
                $window.sessionStorage.selectedTeamName = view_model.selectedTeam.name;
                $rootScope.selectedProjectId = view_model.selectedProject.id;
                $rootScope.selectedProjectName = view_model.selectedProject.name;
                $window.sessionStorage.selectedProjectId = view_model.selectedProject.id;
                $window.sessionStorage.selectedProjectName = view_model.selectedProject.name;
            } else if (!view_model.selectedProject.id && $window.sessionStorage.selectedProjectId) {
                // console.log('Searched');
                view_model.selectedTeam.id = $window.sessionStorage.selectedTeamId;
                view_model.selectedProject.id = $window.sessionStorage.selectedProjectId;
                view_model.selectedTeam.name = $window.sessionStorage.selectedTeamName;
                view_model.selectedProject.name = $window.sessionStorage.selectedProjectName;
            }
        }

        // Get list of work types for the project
        function getWorkTypes(callback) {
            let promiseWorkType = metricsFilterService.getWorkTypes(view_model.selectedProject.id);
            promiseWorkType.then(function (response) {
                view_model.workTypes = [];                                           // Initialize with empty list on each new call
                view_model.selectedWorkTypesModel = [];
                view_model.selectedWorkTypes = [];
                view_model.workTypeError = false;
                // Iterating through each dictionary key and saving the values into workTypes & selectedWorkTypes array
                // All work types are selected initially; append all to selectedWorkTypes
                let count = 1;
                let worktype = {};

                Object.keys(response.data).sort(function (a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                }).map(function (key) {
                    // template for angularjs-dropdown-multiselect
                    worktype = {
                        'id': count,
                        'label': key
                    };
                    view_model.workTypes.push(worktype);
                    view_model.selectedWorkTypesModel.push(worktype);
                    view_model.selectedWorkTypes.push(key);
                    count++;
                });

                if (typeof (callback) === "function" && callback) {
                    callback();
                }
            })
        }

        view_model.dropdownSettings = {
            showCheckAll: true,
            showUncheckAll: true
        };

        // TODO can't read from controller-as syntax; using $scope for now; might be a bug in the ng-dropdown-multiselect library
        $scope.dropdownEvents = {
            workTypes: {
                onSelectionChanged: function () {
                    getSelectedWorkTypes();
                }
            },
        };

        function getSelectedWorkTypes() {
            view_model.selectedWorkTypes = []; // Clear past selection
            for (var index in view_model.selectedWorkTypesModel) {
                view_model.selectedWorkTypes.push(view_model.selectedWorkTypesModel[index].label);
            }
            view_model.workTypeError = view_model.selectedWorkTypes.length <= 0;
        }

        // Invoked by Submit button
        function filter() {
            dateSince = dateService.getDateSince();
            dateUntil = dateService.getDateUntil();
            days = dateService.getDays();

            if (!dateUntil) {
                dateUntil = new Date();
                dateService.setDateUntil(dateUntil);
            }
            if (!dateSince) {
                dateSince = new Date();
                dateSince.setDate(dateUntil.getDate() - 90);
                dateService.setDateSince(dateSince);
            }

            view_model.searchDateSince = dateSince;
            view_model.searchDateUntil = dateUntil;
            view_model.searchDays = dateService.getDays();

            $location.search({
                teamId: view_model.selectedTeam.id,
                projectId: view_model.selectedProject.id,
                teamName: view_model.selectedTeam.name,
                projectName: view_model.selectedProject.name,
                to: formatDate(view_model.searchDateUntil),
                from: formatDate(view_model.searchDateSince),
                workTypes: (view_model.selectedWorkTypes.join())
            });

            (view_model.viewMode === 'issue') ? updateMetrics() : updatePRMetrics();
        }

        function errorHandler(errorResponse, caller) {
            caller = caller || 'default';
            if (caller === 'gitRepo' || caller === 'gitTag') {
                // TODO: handle with alert message, show tooltip on disabled button
                // Git repository or git tag is optional
                view_model.hasGitRepo = false;
                view_model.hasGitTag = false;
                return;
            } else if (caller !== 'default') {
                console.log(errorResponse);
                view_model.graphError = true;
            } else {
                console.log(errorResponse);
                view_model.serverError = true;
            }
            return $q.reject(errorResponse);
        }

        function warningToast(message) {
            let el = angular.element(document.querySelector('#metricsToastController'));
            $mdToast.show(
                $mdToast.simple()
                    .textContent(message)
                    .action('OK')
                    .position('top right')
                    .hideDelay(5000)
            );
        }

        // TODO use dateController
        function formatDate(date) {
            let d = new Date(date),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            return [year, month, day].join('-');
        }

        function buildThroughputGraph() {
            let deferred = $.Deferred();
            let dateLabels = [];
            for (let date in throughputLabels) {
                let newDate = new Date(throughputLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let y_axis_label = (view_model.viewMode === "issue") ? 'Issues Completed' : 'PRs Completed';
            let chart = {
                type: 'LineChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    height: '100%',
                    legend: {position: 'top'},
                    vAxis: {
                        title: y_axis_label,
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        viewWindow: {
                            min: 0
                        },
                        minValue: 0
                    },
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    curveType: 'function',
                    colors: ['#000', '#CCCCCC', '#006400', '#808000', '#cc8400'],
                    defaultColors: ['#000', '#CCCCCC', '#006400', '#808000', '#cc8400'],
                    series: {
                        0: {lineWidth: 3, pointShape: 'circle', pointSize: 7},
                        1: {lineWidth: 0, pointSize: 0},
                        2: {lineWidth: 1, pointShape: 'triangle', pointSize: 10},
                        3: {lineWidth: 1, pointShape: 'square', pointSize: 10},
                        4: {lineWidth: 1, pointShape: 'diamond', pointSize: 10},
                    },
                    annotations: {
                        style: 'line'
                    },
                    focusTarget: 'category'
                }
            };

            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            let sorted = [];
            for (var key in throughputData) {
                sorted[sorted.length] = key;
            }
            sorted.sort().reverse();
            for (var col in sorted) {
                data.addColumn('number', sorted[col]);
                if (sorted[col] === 'Actual') {
                    data.addColumn('number', 'Likeliness');
                }
            }
            for (var week in throughputLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                for (var series in sorted) {
                    key = sorted[series];
                    row.push(throughputData[key][week]);
                    if (sorted[series] === 'Actual') {
                        row.push(null);
                    }
                }
                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in  gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key)) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            row.push(null);
                            row.push(null);
                            row.push(null);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
                chart.view = {
                    columns: Array.from(Array(chart.options.colors.length + 3).keys())
                };
            } else {
                chart.view = {
                    columns: Array.from(Array(chart.options.colors.length + 1).keys())
                };
            }
            chart.data = data;
            view_model.throughputGraph = chart;
            view_model.throughputGraphBuilt = true;
            return deferred.promise();
        }

        function buildVelocityGraph() {
            let deferred = $.Deferred();
            let dateLabels = [];
            for (let date in velocityLabels) {
                let newDate = new Date(velocityLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'AreaChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    height: '100%',
                    legend: {position: 'top'},
                    vAxis: {
                        title: 'Number of Issues',
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        format: 'short'
                    },
                    areaOpacity: 0.1,
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    curveType: 'function',
                    pointSize: 5,
                    series: {
                        0: {lineWidth: 1, pointShape: 'circle'},
                        1: {lineWidth: 1, pointShape: 'triangle'},
                    },
                    annotations: {
                        style: 'line'
                    },
                    focusTarget: 'category'
                }
            };

            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            for (var col in backlogSeries) {
                data.addColumn('number', backlogSeries[col]);
            }
            for (var week in velocityLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                row.push(velocityData[0][week]);
                row.push(velocityData[1][week]);

                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in  gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key) && key > velocityLabels[0]) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
            }
            chart.data = data;
            view_model.velocityGraph = chart;
            view_model.velocityGraphBuilt = true;
            return deferred.promise();
        }

        function buildPRVelocityGraph() {
            let deferred = $.Deferred();
            let dateLabels = [];
            for (let date in velocityLabels) {
                let newDate = new Date(velocityLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'AreaChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    height: '100%',
                    legend: {position: 'top'},
                    vAxis: {
                        title: 'Total Volume (Lines)',
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        format: 'short'
                    },
                    areaOpacity: 0.1,
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    pointSize: 5,
                    series: {
                        0: {lineWidth: 1, pointShape: 'circle', color: "red"},
                        1: {lineWidth: 1, pointShape: 'triangle', color: "blue"}
                    },
                    annotations: {
                        style: 'line'
                    },
                    isStacked: true,
                    focusTarget: 'category'
                }
            };

            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            // Rejected Volume should be first
            for (var col in backlogSeries.sort().reverse()) {
                data.addColumn('number', backlogSeries[col]);
            }
            for (var week in velocityLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                // Rejected Volume should be first
                row.push(velocityData[1][week]);
                row.push(velocityData[0][week]);
                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in  gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key) && key > velocityLabels[0]) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
            }
            chart.data = data;
            view_model.velocityGraph = chart;
            view_model.velocityGraphBuilt = true;
            return deferred.promise();
        }

        function buildPredictabilityGraph() {
            let deferred = $.Deferred();
            let dateLabels = [];
            for (let date in predictabilityLabels) {
                let newDate = new Date(predictabilityLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'LineChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    height: '100%',
                    legend: {position: 'none'},
                    vAxis: {
                        title: 'Predictability (lower variation is better)',
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        viewWindow: {
                            min: 0
                        },
                        minValue: 0
                    },
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    curveType: 'function',
                    pointSize: 5,
                    colors: ['black'],
                    series: {
                        0: {lineWidth: 1}
                    },
                    annotations: {
                        style: 'line'
                    },
                    focusTarget: 'category'
                }
            };
            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            data.addColumn('number', 'CoV');
            for (var week in predictabilityLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                row.push(predictabilityData[week]);
                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key) && key > predictabilityLabels[0]) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
            }
            chart.data = data;
            view_model.predictabilityGraph = chart;
            view_model.predictabilityGraphBuilt = true;
            return deferred.promise();
        }

        function buildOverallLeadTimeGraph() {
            let deferred = $.Deferred();
            let dateLabels = [];
            for (let date in leadTimeLabels) {
                let newDate = new Date(leadTimeLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'LineChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    legend: {position: 'top'},
                    vAxis: {
                        title: 'Working Days',
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        viewWindow: {
                            min: 0
                        },
                        minValue: 0
                    },
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    annotations: {
                        style: 'line'
                    },
                    colors: ['#CC0000', '#0000FF', '#DD9900'],
                    defaultColors: ['#CC0000', '#0000FF', '#DD9900'],
                    curveType: 'function',
                    pointSize: 5,
                    series: {
                        0: {lineWidth: 1, pointShape: 'triangle', pointSize: 10},
                        1: {lineWidth: 1, pointShape: 'star', pointSize: 10},
                        2: {lineWidth: 1, pointShape: 'diamond', pointSize: 10}
                    },
                    focusTarget: 'category'
                }
            };
            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            let sorted = [];
            for (var key in leadTimeData) {
                sorted[sorted.length] = key;
            }
            sorted.sort().reverse();
            for (var col in sorted) {
                data.addColumn('number', sorted[col]);
            }

            for (var week in leadTimeLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                for (var series in sorted) {
                    key = sorted[series];
                    row.push(leadTimeData[key][0][week]);
                }
                data.addRow(row);
            }

            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in  gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key) && key > leadTimeLabels[0]) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            row.push(null);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
                chart.view = {
                    columns: Array.from(Array(Object.keys(chart.options.series).length + 3).keys())
                };
            } else {
                chart.view = {
                    columns: Array.from(Array(Object.keys(chart.options.series).length + 1).keys())
                };
            }
            chart.data = data;
            view_model.leadTimeGraph = chart;
            view_model.leadTimeGraphBuilt = true;
            return deferred.promise();
        }

        function buildDetailedLeadTimeGraph() {
            let dateLabels = [];
            for (let date in leadTimeLabels) {
                let newDate = new Date(leadTimeLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'ColumnChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%'
                    },
                    legend: {position: 'top'},
                    vAxis: {
                        title: 'Lifespan of issue (Working Days)',
                        titleTextStyle: {
                            italic: false
                        },
                        viewWindow: {
                            min: 0
                        },
                        gridlines: {},
                        minValue: 0
                    },
                    annotations: {
                        style: 'line'
                    },
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    colors: ['black', '#e2431e', '#f1ca3a', '#6f9654', '#1c91c0',
                        '#4374e0', '#5c3292', '#572a1a', '#999999', '#1a1a1a'],
                    defaultColors: ['black', '#e2431e', '#f1ca3a', '#6f9654', '#1c91c0',
                        '#4374e0', '#5c3292', '#572a1a', '#999999', '#1a1a1a'],
                    curveType: 'function',
                    seriesType: 'bars',
                }
            };
            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            let newSeries = {};
            let colourIndex = 0;
            for (var col in leadTimeStages) {
                console.log('var col in leadTimeStages');
                console.log(col);
                if (leadTimeStages[col] === 'Overall') {
                    // replace overall title with percentile title
                    newSeries[Object.keys(newSeries).length] = {type: 'line', pointSize: 4};
                    data.addColumn('number', view_model.leadTimePercentile + ' Overall');
                } else {
                    if (view_model.leadTimeTrends) {
                        newSeries[Object.keys(newSeries).length] = {type: 'line', pointSize: 4};
                    } else {
                        newSeries[Object.keys(newSeries).length] = {type: 'bar'};
                    }
                    data.addColumn('number', leadTimeStages[col]);
                }
                colourIndex += 1;
            }
            chart.options.series = newSeries;
            for (var week in leadTimeLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                for (var series in leadTimeStages) {
                    row.push(leadTimeData[view_model.leadTimePercentile][series][week]);
                }
                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key) && key > leadTimeLabels[0]) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            for (var series in leadTimeStages) {
                                row.push(null);
                            }
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
                chart.view = {columns: Array.from(Array(Object.keys(newSeries).length + 3).keys())};
            } else {
                chart.view = {columns: Array.from(Array(Object.keys(newSeries).length + 1).keys())};
            }
            chart.data = data;
            view_model.leadTimeGraph = chart;
            view_model.leadTimeGraphBuilt = true;
        }

        function buildPRLeadTimeGraph() {
            let dateLabels = [];
            let deferred = $.Deferred();
            for (var date in leadTimeLabels) {
                var newDate = new Date(leadTimeLabels[date]);
                newDate.setDate(newDate.getDate());
                dateLabels.push(newDate);
            }
            let chart = {
                type: 'LineChart',
                options: {
                    chartArea: {
                        width: '90%',
                        height: '80%',
                        left: '7%',
                        top: '7%'
                    },
                    legend: {position: 'top'},
                    vAxis: {
                        title: 'Working Days',
                        titleTextStyle: {
                            italic: false
                        },
                        gridlines: {},
                        viewWindow: {
                            min: 0
                        },
                        minValue: 0
                    },
                    hAxis: {
                        title: 'Weeks',
                        titleTextStyle: {
                            italic: false
                        },
                        format: 'M/d/yy',
                        ticks: dateLabels,
                        gridlines: {}
                    },
                    annotations: {
                        style: 'line'
                    },
                    colors: ['#CC0000', '#0000FF', '#DD9900'],
                    defaultColors: ['#CC0000', '#0000FF', '#DD9900'],
                    curveType: 'function',
                    pointSize: 5,
                    series: {
                        0: {lineWidth: 1, pointShape: 'triangle', pointSize: 10},
                        1: {lineWidth: 1, pointShape: 'star', pointSize: 10},
                        2: {lineWidth: 1, pointShape: 'diamond', pointSize: 10}
                    },
                    focusTarget: 'category'
                }
            };
            let data = new google.visualization.DataTable();
            data.addColumn('datetime', 'Week');
            if (view_model.showTags) {
                data.addColumn({type: 'string', role: 'annotation'});
                data.addColumn({type: 'string', role: 'tooltip'});
            }
            let sorted = [];
            for (var key in leadTimeData) {
                sorted[sorted.length] = key;
            }
            sorted.sort().reverse();
            for (var col in sorted) {
                data.addColumn('number', sorted[col]);
            }
            for (var week in leadTimeLabels) {
                var row = [];
                row.push(dateLabels[week]);
                if (view_model.showTags) {
                    row.push(null);
                    row.push(null);
                }
                for (var series in sorted) {
                    key = sorted[series];
                    row.push(leadTimeData[key][week]);
                }
                data.addRow(row);
            }
            if (view_model.showTags) {
                for (var repo in gitData) {
                    for (var key in  gitData[repo]) {
                        var row = [];
                        if (gitData[repo].hasOwnProperty(key)) {
                            row.push(new Date(key));
                            row.push('');
                            row.push(gitData[repo][key]);
                            row.push(null);
                            row.push(null);
                            row.push(null);
                            data.addRow(row);
                        }
                    }
                }
                chart.options.vAxis.gridlines.color = 'transparent';
                chart.options.hAxis.gridlines.color = 'transparent';
                chart.view = {
                    columns: Array.from(Array(chart.options.colors.length + 3).keys())
                };
            } else {
                chart.view = {
                    columns: Array.from(Array(chart.options.colors.length + 1).keys())
                };
            }
            view_model.leadTimeGraph = chart;
            view_model.leadTimeGraphBuilt = true;
            chart.data = data;
            return deferred.promise();
        }

        function hideTPSeries(selectedItem) {
            let col = selectedItem.column;
            if (selectedItem.row === null) {
                if (view_model.throughputGraph.view.columns[col] === col) {
                    view_model.throughputGraph.view.columns[col] = {
                        label: view_model.throughputGraph.data.Mf[col].label,
                        type: view_model.throughputGraph.data.Mf[col].type,
                        calc: function () {
                            return null;
                        }
                    };
                    view_model.throughputGraph.options.colors[col - 1] = '#CCCCCC';
                } else {
                    view_model.throughputGraph.view.columns[col] = col;
                    view_model.throughputGraph.options.colors[col - 1] = view_model.throughputGraph.options.defaultColors[col - 1];
                }
            }
        }

        function hideLTSeries(selectedItem) {
            let col = selectedItem.column;
            if (selectedItem.row === null) {
                if (view_model.leadTimeGraph.view.columns[col] === col) {
                    view_model.leadTimeGraph.view.columns[col] = {
                        label: view_model.leadTimeGraph.data.Mf[col].label,
                        type: view_model.leadTimeGraph.data.Mf[col].type,
                        calc: function () {
                            return null;
                        }
                    };
                    view_model.leadTimeGraph.options.colors[col - 1] = '#CCCCCC';
                } else {
                    view_model.leadTimeGraph.view.columns[col] = col;
                    view_model.leadTimeGraph.options.colors[col - 1] = view_model.leadTimeGraph.options.defaultColors[col - 1];
                }
            }
        }

        function changePercentileCurve() {
            isPointsStraight = !isPointsStraight;
            if (isPointsStraight === true) {
                for (var key in straightDataPoints) {
                    throughputData[key] = straightDataPoints[key];
                }
            } else {
                for (var key in curvedDataPoints) {
                    throughputData[key] = curvedDataPoints[key];
                }
            }
            googleChartApiPromise.then(buildThroughputGraph);
        }

        function toggleGitTags() {
            if (!view_model.hasGitRepo) {
                warningToast("No Github repos are defined for this project.\n");
                return
            }
            if (!view_model.hasGitTag) {
                warningToast("No tags can be found in current time period with current repo.\n");
                return
            }
            buildThroughputGraph();
            buildPredictabilityGraph();
            if (view_model.viewMode === "issue") {
                buildVelocityGraph();
                (view_model.leadTimeMode === 'overall') ? buildOverallLeadTimeGraph() : buildDetailedLeadTimeGraph();
            } else {
                buildPRVelocityGraph();
                buildPRLeadTimeGraph();
            }
        }

        function leadTimePercentileChange() {
            buildDetailedLeadTimeGraph();
        }

        function changeVelocityCurve() {
            velocityData = (view_model.velocityRelative === false) ? absoluteBacklogHistory : relativeBacklogHistory;
            buildVelocityGraph();
        }

        function showLeadTimeTrends() {
            buildDetailedLeadTimeGraph();
        }

        function leadTimeModeChange() {
            (view_model.leadTimeMode === 'overall') ? buildOverallLeadTimeGraph() : buildDetailedLeadTimeGraph();
        }

        function viewModeChange() {
            if (view_model.viewMode === 'issue') {
                console.log("Issue View");
                updateWebpageConstants();
                updateMetrics();
            } else {
                if (Object.keys(gitData).length === 0) {
                    warningToast("No Github repos are defined for this project.\n");
                    view_model.viewMode = 'issue';
                    return
                }
                console.log("Pull requests view");
                updateWebpageConstants();
                updatePRMetrics();
            }
        }

        function downloadThroughput() {
            view_model.fileName = view_model.selectedProject.name + "_" + view_model.viewMode + "_" +
                formatDate(view_model.searchDateSince) + "-" + formatDate(view_model.searchDateUntil);

            return throughputLabels.map(function (e, i) {
                return [e.slice(0, 10), throughputData["Actual"][i], throughputTickets[i]];
            });
        }

        function projectETL() {
            let projectETLPromise = metricsDataService.projectETL(view_model.selectedProject.id, false);
            projectETLPromise.then(function (response) {
                warningToast("Successfully triggered ETL for " + view_model.selectedProject.name + ". Please come back later when data gets loaded.");
            }).catch(function (errorResponse) {
                warningToast(errorResponse.data)
            })
        }

        function issueTypeETL() {
            let issueTypeETlPromise = metricsDataService.projectETL(view_model.selectedProject.id, true);
            issueTypeETlPromise.then(function (response) {
                warningToast("Successfully triggered issue type ETL.");
                setTimeout(function () {
                    window.location.reload()
                }, 2500)
            }).catch(function (errorResponse) {
                warningToast(errorResponse.data)
            })
        }

        function workStatesSettingsModal(ev) {
            view_model.editingWorkStates = true;
            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'components/configurations/editWorkStates.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
            })
                .then(function () {
                    // on success
                    view_model.editingWorkStates = false;
                }, function () {
                    // on cancel
                    view_model.editingWorkStates = false;
                });
        }

        function workTypesSettingsModal(ev) {
            view_model.editingWorkTypes = true;
            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'components/configurations/editWorkTypes.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
            })
                .then(function () {
                    // on success
                    view_model.editingWorkTypes = false;
                    getWorkTypes();
                }, function () {
                    // on cancel
                    view_model.editingWorkTypes = false;
                });
        }

        function projectSettingsModal(ev) {
            view_model.editingProject = true;
            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'components/configurations/editProject.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
            })
                .then(function () {
                    // on success
                    view_model.editingProject = false;
                }, function () {
                    // on cancel
                    view_model.editingProject = false;
                });
        }

        //helper function to build new URL based on current URL parameters
        function buildNewURL() {
            let currURL = window.location.href;
            let URLQueryParams = currURL.split("&");
            //remove first part of URL that contains root address, so that just the params remain 
            let initLink = URLQueryParams[0].split("?")[0].replace('metrics', 'reports');
            URLQueryParams[0] = URLQueryParams[0].split("?")[1];

            let newURLString = "";
            for (let i = 0; i < URLQueryParams.length; i++) {
                if (URLQueryParams[i].includes("teamId") || URLQueryParams[i].includes("projectId") ||
                    URLQueryParams[i].includes("teamName") || URLQueryParams[i].includes("projectName") ||
                    URLQueryParams[i].includes("workTypes")) {
                    if (newURLString === "")
                        newURLString += "?" + URLQueryParams[i];
                    else
                        newURLString += "&" + URLQueryParams[i];
                }
            }

            //add any elements from sessionStorage as well
            if ($window.sessionStorage.selectedBoardID !== null)
                newURLString += "&boardID=" + $window.sessionStorage.selectedBoardID;

            //SHOULD BE LAST PART OF URL STRING
            //add selected work types as well
            newURLString += "&selectedWorkTypes=" + view_model.selectedWorkTypes.join(',');

            //store in sessionStorage to add to new URL later
            sessionStorage.setItem('newURLString', newURLString);
            let linkDOM = document.getElementById("reports-Link");
            let link = initLink + newURLString;
            linkDOM.setAttribute("href", link);
        }

        function changeSelectedWorkTypes() {
            //get initial link
            let linkDOM = document.getElementById("reports-Link");
            let link = linkDOM.href;

            //remove current selectedworktypes
            let newURL = link.split("&selectedWorkTypes=")[0];

            //get new selected
            let workTypesArrLength = Object.keys(view_model.selectedWorkTypesModel).length;
            let selectedWorkTypesString = "";
            for (let i = 0; i < workTypesArrLength; i++) {
                if (i === workTypesArrLength - 1)
                    selectedWorkTypesString += encodeURIComponent(view_model.selectedWorkTypesModel[i].label);
                else
                    selectedWorkTypesString += encodeURIComponent(view_model.selectedWorkTypesModel[i].label) + ",";
            }

            //append new worktypes to url
            newURL += "&selectedWorkTypes=" + selectedWorkTypesString;
            linkDOM.setAttribute("href", newURL);
        }

        function openMenu() {
            $('.mainNavDropDown').slideToggle(500);
            let body = window.$("body");
            setTimeout(function () {
                if (view_model.hamburgerMenuOpened) {
                    view_model.hamburgerMenuOpened = false;
                    body.removeClass("hamburgerOpened");
                } else {
                    view_model.hamburgerMenuOpened = true;
                    body.addClass("hamburgerOpened")
                }
            }, 600);
        }

        function getBoardID() {
            let promiseJiraIssueConfiguration = metricsDataService.getJiraIssueConfiguration(view_model.selectedProject.id);
            promiseJiraIssueConfiguration.then(function (responseBoard) {
                let boardIDPromise = metricsDataService.getBoardID(responseBoard["data"]["boardName"]);
                boardIDPromise.then(function (responseID) {
                    $window.sessionStorage.selectedBoardID = responseID["data"]["board_id"];
                    let linkDOM = document.getElementById("JIRA-Link");
                    let link = constants.JIRA_HOST_URL + '/secure/RapidBoard.jspa?rapidView=' + responseID["data"]['board_id'];
                    linkDOM.setAttribute("href", link);
                    buildNewURL();
                });
            });
            addWebpageConstants();
        }

        function assignLink(element, value) {
            element.href = value
        }

        function addWebpageConstants() {
            if (!$rootScope.VGER_GUIDE) {
                constantsService.setRootScopeConstants();
            }

            assignLink(document.getElementById("vger_guide_link"), $rootScope.VGER_GUIDE);
            assignLink(document.getElementById("quadrant_1_link"), $rootScope.THROUGHPUT_README);
            assignLink(document.getElementById("quadrant_3_link"), $rootScope.THROUGHPUT_VARIATION_README);
            assignLink(document.getElementById("quadrant_4_link"), $rootScope.LEADTIMES_README);
            assignLink(document.getElementById("jira_support_project_url"), constants.JIRA_SUPPORT_URL);
            assignLink(document.getElementById("jira_support_project_url2"), constants.JIRA_SUPPORT_URL);
            assignLink(document.getElementById("jira_support_project_url3"), constants.JIRA_SUPPORT_URL);
            assignLink(document.getElementById("jira_support_project_url4"), constants.JIRA_SUPPORT_URL);
            assignLink(document.getElementById("jira_support_project_url5"), constants.JIRA_SUPPORT_URL);
        }

        function updateWebpageConstants() {
            if (view_model.viewMode === 'issue') {
                assignLink(document.getElementById("quadrant_2_link"), $rootScope.BACKLOG_README);
            } else {
                assignLink(document.getElementById("quadrant_2_link"), $rootScope.PR_GROWTH_README);
            }
        }

        function DialogController($scope, $mdDialog) {
            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };
        }

        function updatePRMetrics() {
            view_model.throughputGraphBuilt = false;
            view_model.velocityGraphBuilt = false;
            view_model.predictabilityGraphBuilt = false;
            view_model.leadTimeGraphBuilt = false;
            view_model.submitted = true;
            view_model.graphError = false;
            view_model.workTypeError = false;

            dateSince = formatDate(view_model.searchDateSince);
            dateUntil = formatDate(view_model.searchDateUntil);

            let repoNameList = Object.keys(gitData);

            let prHistoryPromise = metricsDataService.getPRHistoryData(repoNameList, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let prStatisticsPromise = metricsDataService.getPRStatisticsData(repoNameList, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let prPredictabilityPromise = metricsDataService.getPRPredictabilityData(repoNameList, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let prLeadtimePromise = metricsDataService.getPRLeadtimeData(repoNameList, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let prBacklogPromise = metricsDataService.getPRBacklogData(repoNameList, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let throughputGitTagPromise = metricsDataService.getThroughputGitTagData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);

            throughputGitTagPromise.then(function (response) {
                for (let repo in response.data) {
                    let tags = response.data[repo];
                    for (let tag in tags) {
                        let date = response.data[repo][tag][0];
                        gitData[repo][date] = response.data[repo][tag][1];
                    }
                    if (tags.length > 0) {
                        view_model.hasGitTag = true;
                    }
                }
                // Build Throughput Graph
                // ================== START prHistoryPromise  =============================
                prHistoryPromise.then(function (response) {
                    straightDataPoints = [];

                    throughputLabels = [];
                    let dataPoints = [];
                    for (let tuple in response.data) {
                        let indexString = response.data[tuple][0];
                        if (indexString.includes("Straight")) {
                            console.log("made it");
                            if (!(indexString === "ninetiethStraight" || indexString === "eightiethStraight")) {
                                if (indexString === 'tenthStraight') {
                                    indexString = '90%';
                                } else if (indexString === 'twentiethStraight') {
                                    indexString = '80%';
                                } else if (indexString === 'fiftiethStraight') {
                                    indexString = '50%';
                                }
                                straightDataPoints[indexString] = response.data[tuple][1];
                            }
                        } else
                            dataPoints.push(response.data[tuple][1]);
                    }
                    throughputData['Actual'] = dataPoints;

                    prStatisticsPromise.then(function (response) {
                        for (var key in response.data) {
                            let insertKey = '';
                            if (key === 'ninetieth') {
                                continue;
                            } else if (key === 'eightieth') {
                                continue;
                            } else if (key === 'fiftieth') {
                                insertKey = '50%';
                            } else if (key === 'twentieth') {
                                insertKey = '80%';
                            } else if (key === 'tenth') {
                                insertKey = '90%';
                            }
                            var weeks = response.data[key];
                            let dataPoints = [];
                            for (var week in weeks) {
                                dataPoints.push(weeks[week][1]);
                            }
                            curvedDataPoints[insertKey] = dataPoints;
                        }
                        var weeks = response.data[Object.keys(response.data)[0]];
                        for (var week in weeks) {
                            throughputLabels.push(weeks[week][0]);
                        }

                        for (var key in curvedDataPoints) {
                            throughputData[key] = curvedDataPoints[key];
                        }
                        googleChartApiPromise.then(buildThroughputGraph) // <---
                    });
                }).catch(function (errorResponse) {
                    errorHandler(errorResponse, 'throughput');
                });
                // ================== END prHistoryPromise  ===============================

                // Build Predictability Graph
                // ================== START predictabilityPromise  ==========================
                prPredictabilityPromise.then(function (response) {
                    predictabilityLabels = [];
                    let dataPoints = [];
                    for (var week in response.data) {
                        predictabilityLabels.push(response.data[week][0]);
                        dataPoints.push(response.data[week][1]);
                    }
                    predictabilityData = dataPoints;
                    googleChartApiPromise.then(buildPredictabilityGraph); // <---
                }).catch(function (errorResponse) {
                    errorHandler(errorResponse, 'predictability');
                });
                // ================== END predictabilityPromise  ==========================

                // Build Leadtime Graph
                // ================== START leadTimePromise ==========================
                prLeadtimePromise.then(function (response) {
                    leadTimeLabels = [];
                    // console.log('leadTimePromise returned ', response.status, ' with response data: ', response.data);
                    for (var key in response.data) {
                        var weeks = response.data[key];
                        let insertKey = '';
                        if (key === 'ninetieth') {
                            insertKey = '90%';
                        } else if (key === 'eightieth') {
                            insertKey = '80%';
                        } else if (key === 'fiftieth') {
                            insertKey = '50%';
                        }
                        let tmpLabels = [];
                        let dataPoints = [];
                        for (var week in weeks) {
                            tmpLabels.push(weeks[week][0]);
                            dataPoints.push(weeks[week][1]);
                        }
                        if (leadTimeLabels.length < 1) {
                            leadTimeLabels = (tmpLabels);
                        }
                        leadTimeData[insertKey] = dataPoints;
                    }

                    googleChartApiPromise.then(buildPRLeadTimeGraph); // <---

                }).catch(function (errorResponse) {
                    errorHandler(errorResponse, 'leadtime');
                });
                // ================== END leadTimePromise ==========================

                // Build Backlog Graph
                // ================== START backlogPromise =========================
                prBacklogPromise.then(function (response) {
                    velocityLabels = [];
                    velocityData = [];
                    backlogSeries = [];
                    for (var key in response.data) {
                        var weeks = response.data[key];
                        let dataPoints = [];
                        for (var week in weeks) {
                            if (week == 0) {
                                continue;
                            }
                            dataPoints.push(weeks[week][1]);
                        }
                        backlogSeries.push(key);
                        velocityData.push(dataPoints);
                    }
                    var weeks = response.data[Object.keys(response.data)[0]];
                    for (var week in weeks) {
                        velocityLabels.push(weeks[week][0]);
                    }
                    // From API it's using start of week as week label so slicing the label make it shifted 1 week later
                    // which is exactly what UI wants: use end of week as label.
                    // Also since the current week has not ended yet so last value get ignored
                    velocityLabels = velocityLabels.slice(1, velocityLabels.length);
                    googleChartApiPromise.then(buildPRVelocityGraph); // <---
                }).catch(function (errorResponse) {
                    errorHandler(errorResponse, 'velocity');
                });
                // ================== END backlogPromise ===========================
            });
        }

        function updateMetrics() {
            view_model.throughputGraphBuilt = false;
            view_model.velocityGraphBuilt = false;
            view_model.predictabilityGraphBuilt = false;
            view_model.leadTimeGraphBuilt = false;
            view_model.submitted = true;
            view_model.graphError = false;
            view_model.workTypeError = false;
            view_model.viewMode = 'issue';
            throughputLabels = [];
            velocityLabels = [];
            predictabilityLabels = [];
            leadTimeLabels = [];

            dateSince = formatDate(view_model.searchDateSince);
            dateUntil = formatDate(view_model.searchDateUntil);

            // All Graphs Promises
            let throughputGitRepoPromise = metricsDataService.getThroughputGitRepoData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let throughputGitTagPromise = metricsDataService.getThroughputGitTagData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);

            // Throughput Graph Promises
            let throughputStatisticsPromise = metricsDataService.getThroughputStatisticsData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let throughputHistoryPromise = metricsDataService.getThroughputHistoryData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);

            // Velocity Graph Promises
            let velocityPromise = metricsDataService.getVelocityData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);

            // Predictability Graph Promises
            let predictabilityPromise = metricsDataService.getPredictabilityData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);

            // LeadTime Graph Promises
            let workStatesPromise = metricsDataService.getWorkStates(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);
            let leadTimePromise = metricsDataService.getLeadTimeData(view_model.selectedWorkTypes, view_model.selectedProject.id, view_model.searchDays, dateSince, dateUntil);


            // ================== START throughputGitRepoPromise ================
            throughputGitRepoPromise.then(function (response) {
                for (let repo in response.data) {
                    let repoName = response.data[repo];
                    gitData[repoName] = {};
                }
                if (response.data.length > 0) {
                    view_model.hasGitRepo = true;
                }
                // ================== START throughputGitTagPromise ==================
                throughputGitTagPromise.then(function (response) {
                    for (let repo in response.data) {
                        let tags = response.data[repo];
                        for (let tag in tags) {
                            var tagName = response.data[repo][tag][1];
                            let date = response.data[repo][tag][0];
                            gitData[repo][date] = tagName;
                        }
                        if (tags.length > 0) {
                            view_model.hasGitTag = true;
                        }
                    }
                    // Build Throughput Graph
                    // ================== START throughputHistoryPromise ================
                    throughputHistoryPromise.then(function (response) {
                        // console.log('throughputHistoryPromise returned ', response.status, ' with response data: ', response.data);

                        //split response.data because it contains throughput data and tickets
                        let ticketStrings = response.data.slice(response.data.indexOf("tickets"));
                        //zeroeth index is "tickets", not needed anymore
                        ticketStrings = ticketStrings.splice(1);
                        //add parenbtheses to each string for easier copy and paste into JIRA
                        for (let i = 0; i < ticketStrings.length; i++) {
                            throughputTickets[i] = "(" + ticketStrings[i][1] + ")";
                        }
                        let dataPoints = [];
                        straightDataPoints = [];
                        for (let tuple in response.data) {
                            let indexString = response.data[tuple][0];
                            if (indexString.includes("Straight")) {
                                if (!(indexString === "ninetiethStraight" || indexString === "eightiethStraight")) {
                                    if (indexString === 'tenthStraight') {
                                        indexString = '90%';
                                    } else if (indexString === 'twentiethStraight') {
                                        indexString = '80%';
                                    } else if (indexString === 'fiftiethStraight') {
                                        indexString = '50%';
                                    }
                                    straightDataPoints[indexString] = response.data[tuple][1];
                                }
                            } else {
                                dataPoints.push(response.data[tuple][1]);
                            }
                        }

                        throughputData['Actual'] = dataPoints;

                        // ================== START throughputStatisticsPromise ============
                        throughputStatisticsPromise.then(function (response) {
                            //console.log('throughputStatisticsPromise returned ', response.status, ' with response data: ', response.data);
                            for (var key in response.data) {
                                let insertKey = '';
                                if (key === 'ninetieth') {
                                    continue;
                                } else if (key === 'eightieth') {
                                    continue;
                                } else if (key === 'fiftieth') {
                                    insertKey = '50%';
                                } else if (key === 'twentieth') {
                                    insertKey = '80%';
                                } else if (key === 'tenth') {
                                    insertKey = '90%';
                                }

                                var weeks = response.data[key];
                                let dataPoints = [];
                                for (var week in weeks) {
                                    dataPoints.push(weeks[week][1]);
                                }
                                curvedDataPoints[insertKey] = dataPoints;
                            }
                            var weeks = response.data[Object.keys(response.data)[0]];
                            for (var week in weeks) {
                                throughputLabels.push(weeks[week][0]);
                            }

                            for (var key in curvedDataPoints) {
                                throughputData[key] = curvedDataPoints[key];
                            }
                            googleChartApiPromise.then(buildThroughputGraph) // <---
                        }).catch(function (errorResponse) {
                            errorHandler(errorResponse, 'throughput');
                        });
                        // ================== END throughputStatisticsPromise ===============

                    }).catch(function (errorResponse) {
                        errorHandler(errorResponse, 'throughput');
                    });
                    // ================== END throughputHistoryPromise ==================

                    // Build Velocity Graph
                    // ================== START velocityPromise =================================
                    velocityPromise.then(function (response) {
                        let backlogSize = 0;
                        absoluteBacklogHistory = [];
                        relativeBacklogHistory = [];
                        backlogSeries = [];

                        for (var key in response.data) {
                            var weeks = response.data[key];
                            let dataPoints = [];
                            for (var week in weeks) {
                                if (week === 0) {
                                    backlogSize = weeks[week][1];
                                    continue;
                                }
                                dataPoints.push(weeks[week][1]);
                            }
                            let tmpRelativeBacklogHistory = [];
                            for (let i = 0; i <= dataPoints.length - 1; i++) {
                                tmpRelativeBacklogHistory.push(dataPoints[i] - backlogSize);
                            }
                            backlogSeries.push(key);
                            absoluteBacklogHistory.push(dataPoints);
                            relativeBacklogHistory.push(tmpRelativeBacklogHistory);
                        }
                        var weeks = response.data[Object.keys(response.data)[0]];
                        for (var week in weeks) {
                            velocityLabels.push(weeks[week][0]);
                        }
                        velocityLabels = velocityLabels.slice(1, velocityLabels.length);
                        velocityData = absoluteBacklogHistory;
                        view_model.velocityRelative = false;
                        googleChartApiPromise.then(buildVelocityGraph); // <---
                    }).catch(function (errorResponse) {
                        errorHandler(errorResponse, 'velocity');
                    });
                    // ================== END velocityPromise ===================================

                    // Build Predictability Graph
                    // ================== START predictabilityPromise  ==========================
                    predictabilityPromise.then(function (response) {
                        let dataPoints = [];
                        for (var week in response.data) {
                            predictabilityLabels.push(response.data[week][0]);
                            dataPoints.push(response.data[week][1]);
                        }
                        predictabilityData = dataPoints;
                        googleChartApiPromise.then(buildPredictabilityGraph); // <---
                    }).catch(function (errorResponse) {
                        errorHandler(errorResponse, 'predictability');
                    });
                    // ================== END predictabilityPromise  ==========================

                    // Build Lead Time Graph
                    // ================== START workStatesPromise  ==========================
                    workStatesPromise.then(function (response) {
                        let workStates = {'Overall': 0};
                        for (let i in response.data['workStates']) {
                            workStates[response.data['workStates'][i]['name']] = i + 1;
                        }
                        // ================== START leadTimePromise ==========================
                        leadTimePromise.then(function (response) {
                            leadTimeStages = new Array(Object.keys(workStates).length).fill(null);
                            leadTimeStages = leadTimeStages.filter(function (n) {
                                return n !== undefined
                            });
                            for (var key in response.data) {
                                let stages = response.data[key];
                                let insertKey = '';
                                if (key === 'ninetieth') {
                                    insertKey = '90%';
                                } else if (key === 'eightieth') {
                                    insertKey = '80%';
                                } else if (key === 'fiftieth') {
                                    insertKey = '50%';
                                }
                                leadTimeData[insertKey] = new Array(Object.keys(workStates).length).fill(0);
                                for (let stage in stages) {
                                    let tmpLabels = [];
                                    let dataPoints = [];
                                    var weeks = stages[stage];
                                    for (var week in weeks) {
                                        tmpLabels.push(weeks[week][0]);
                                        dataPoints.push(weeks[week][1]);
                                    }
                                    leadTimeData[insertKey][parseInt(workStates[stage])] = dataPoints;
                                    leadTimeStages[parseInt(workStates[stage])] = stage;
                                    if (leadTimeLabels.length < 1) {
                                        leadTimeLabels = (tmpLabels);
                                    }
                                }
                            }
                            view_model.leadTimeTrends = false;
                            view_model.leadTimeMode = 'overall';
                            view_model.leadTimePercentile = '90%';
                            googleChartApiPromise.then(buildOverallLeadTimeGraph); // <---

                        }).catch(function (errorResponse) {
                            errorHandler(errorResponse, 'leadTime');
                        });
                        // ================== END leadTimePromise ==========================
                    }).catch(function (errorResponse) {
                        errorHandler(errorResponse, 'leadTime');
                    });
                    // ================== END workStatesPromise ==========================

                }).catch(function (errorResponse) {
                    view_model.hasGitTag = false;
                    errorHandler(errorResponse, 'gitTag');
                });
                // ================== END throughputGitTagPromise ====================

            }).catch(function (errorResponse) {
                view_model.hasGitRepo = false;
                errorHandler(errorResponse, 'gitRepo');
            });
            // ================== END throughputGitRepoPromise ==================

            //build new URL for reports
            changeSelectedWorkTypes();
        }
    }
})();
