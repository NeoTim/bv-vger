/*
 *  Controller for the editWorkStates.html, editWorkTypes.html and editProject.html
 */
(function(){
    'use strict';

    angular.module('vgerConfigurationsController', [])
    .controller('configurationsController', configurationsController)
    .filter('trusted', trusted)
    .config(function($mdThemingProvider, $mdIconProvider) {
        $mdThemingProvider
        .theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('blue-grey')
        .warnPalette('deep-orange')
        .backgroundPalette('grey');
    
        $mdThemingProvider.theme('selected-card').backgroundPalette('teal', {
          'default': '400',
          'hue-1': '100',
          'hue-2': '600',
          'hue-3': 'A100'
      });
        
        $mdThemingProvider.theme('unselected-card').backgroundPalette('blue-grey', {
          'default': '400',
          'hue-1': '100',
          'hue-2': '600',
          'hue-3': 'A100'
      });
      
      $mdIconProvider.fontSet('md', 'material-icons');
    });
    
    // Allows custom styling on ngSanitize
    trusted.$inject = ['$sce'];
    function trusted($sce) {
        return function(html){
            return $sce.trustAsHtml(html)
        }
    }
    
    configurationsController.$inject = ['$scope', '$rootScope', '$window', '$location', '$mdToast', '$sanitize', 'configurationsService'];
    function configurationsController($scope, $rootScope, $window, $location, $mdToast, $sanitize, configurationsService) {
        let view_model = this;

        // UI elements
        view_model.teams = [];
        view_model.projects = [];
        view_model.selectedTeam = {};
        view_model.selectedProject = {};
        view_model.getConfiguration = getConfiguration;
        view_model.onDrop = onDrop;
        view_model.onDropStates = onDropStates;
        view_model.createNewState = createNewState;
        view_model.createNewType = createNewType;
        view_model.cancelNewState = cancelNewState;
        view_model.cancelNewType = cancelNewType;
        view_model.saveNewState = saveNewState;
        view_model.saveNewType = saveNewType;
        view_model.deleteState = deleteState;
        view_model.deleteType = deleteType;
        view_model.projectETL = projectETL;
        view_model.issueTypeETL = issueTypeETL;
        view_model.disableETL = false;
        view_model.creatingNewState = false;
        view_model.creatingNewType = false;
        
        view_model.selectLeadTime = selectLeadTime;
        view_model.startLeadTime;
        view_model.endLeadTime;
        view_model.selectedStartLeadTime = false;
        view_model.selectedEndLeadTime = false;
        view_model.newStateError = false;
        view_model.newTypeError = false;
        view_model.currentStart;
        view_model.currentEnd;

        // Configuration data variable
        view_model.jiraConfigData;
        view_model.jiraIssueConfigData;
        view_model.jiraWorkTypes = [];
        view_model.jiraWorkStates = [];
        view_model.issueFilter;
        view_model.includeSubtasks = false;
        view_model.excludedIssueTypes = [];
        view_model.repos = [];
        view_model.errorMessage;
        view_model.showDeleteButton = false;
        
        view_model.updateProjectSettings = updateProjectSettings;
        view_model.updateWorkTypes = updateWorkTypes;
        view_model.updateWorkStates = updateWorkStates;
        view_model.getIssueFilter = getIssueFilter;
        view_model.resetToBoard = resetToBoard;
        view_model.resetJQLToBoard = resetJQLToBoard;

        view_model.loading = false;
        getSessionScope();
        getConfiguration();

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
                view_model.selectedTeam.id = $window.sessionStorage.selectedTeamId;
                view_model.selectedProject.id = $window.sessionStorage.selectedProjectId;
                view_model.selectedTeam.name = $window.sessionStorage.selectedTeamName;
                view_model.selectedProject.name = $window.sessionStorage.selectedProjectName;
            }
        }


        // When Team and Project has been selected, fetch their configurations
        function getConfiguration() {
            getJiraIssueConfiguration();
            getJiraWorkTypesConfiguration();
            getJiraWorkStatesConfiguration();
            getGitConfiguration();
            getETLStatus();
        }

        function getIssueFilter(jql) {
            let promiseIssueFilter = configurationsService.getIssueFilter(jql);
            promiseIssueFilter.then(function(response) {
                let issueFilterData = response['data'];
                let dateFieldIndex = issueFilterData['dateFieldIndex'];
                let issueTypeFieldIndex = issueFilterData['issueTypeFieldIndex'];
                view_model.issueFilter = issueFilterData['filteredJQL'];

                let warningIndex = [];
                for (var i in dateFieldIndex) {
                    warningIndex.push([dateFieldIndex[i], 'date']);
                }
                for (var i in issueTypeFieldIndex) {
                    warningIndex.push([issueTypeFieldIndex[i], 'issueType']);
                }
                view_model.showWarning = dateFieldIndex.length > 0 || issueTypeFieldIndex.length > 0;

                // order by smallest to greatest starting index
                warningIndex.sort(function(a,b){return a[0][0] > b[0][0]});

                // define custom insert string function
                String.prototype.insert = function (index, string) {
                    if (index > 0) {
                        return this.substring(0, index) + string + this.substring(index, this.length);
                    } else {
                        return string + this;
                    }
                };

                // highlights the query that should be removed (rendered as HTML using ngSanitize)
                let openSpanDateField = '<span style="background-color: #ffc9c9">';
                let openSpanIssueTypeField = '<span style="background-color: #F7DC6F">';
                let closeSpan = '</span>';
                let index = 0;
                view_model.issueFilterHTML = view_model.issueFilter;
                
                // finding beginning and ending of the string indices
                for (var i in warningIndex) {
                    if (warningIndex[i][1] === 'date') {
                        view_model.issueFilterHTML = view_model.issueFilterHTML.insert(index + warningIndex[i][0][0], openSpanDateField);
                        index += openSpanDateField.length;
                    }
                    else if (warningIndex[i][1] === 'issueType'){
                        view_model.issueFilterHTML = view_model.issueFilterHTML.insert(index + warningIndex[i][0][0], openSpanIssueTypeField);
                        index += openSpanIssueTypeField.length;
                    }
                    view_model.issueFilterHTML = view_model.issueFilterHTML.insert(index + warningIndex[i][0][1], closeSpan);
                    index += closeSpan.length;
                }
                
            }).catch(function(errorResponse) {
                console.log('promiseIssueFilter failed');
                view_model.errorMessage = errorResponse;
            });
        }

        // Fetch jira issue configuration
        function getJiraIssueConfiguration() {
            let promiseJiraIssueConfiguration = configurationsService.getJiraIssueConfiguration(view_model.selectedProject.id);
            promiseJiraIssueConfiguration.then(function(response) {
                view_model.jiraIssueConfigData = response['data'];
                view_model.boardName = view_model.jiraIssueConfigData['boardName'];
                view_model.projectName = view_model.jiraIssueConfigData['name'];
                view_model.includeSubtasks = view_model.jiraIssueConfigData['includeSubtasks'];
                if (view_model.jiraIssueConfigData['excludedIssueTypes'] !== "") {
                    view_model.excludedIssueTypes = view_model.jiraIssueConfigData['excludedIssueTypes'].split(',');
                } 
                else {
                    view_model.excludedIssueTypes = [];
                }
                view_model.getIssueFilter(view_model.jiraIssueConfigData['issueFilter']);
                
            }).catch(function(errorResponse) {
                console.log('promiseJiraIssueConfiguration failed');
                view_model.errorMessage = errorResponse;
            });
        }

        // Fetch list of jira issue types & work types 
        function getJiraWorkTypesConfiguration() {
            let promiseJiraWorkTypesConfiguration = configurationsService.getJiraWorkTypesConfiguration(view_model.selectedProject.id);
            promiseJiraWorkTypesConfiguration.then(function(response) {
                view_model.jiraWorkTypes = response['data'];
                let temp = [];
                for (var i in view_model.jiraWorkTypes) {
                    let workType = {};
                    workType['workTypeName'] = i;
                    workType['issueTypes'] = [];
                    for (var j in view_model.jiraWorkTypes[i]) {
                        let issueType = {};
                        issueType['label'] = view_model.jiraWorkTypes[i][j];
                        issueType['selected'] = false;
                        workType['issueTypes'].push(issueType);
                    }
                    temp.push(workType)
                }
                // Sort alphanumerically
                temp = sortByKey(temp, 'workTypeName');
                view_model.jiraWorkTypes = temp;
            }).catch(function(errorResponse) {
                console.log('promiseJiraWorkTypesConfiguration failed');
                view_model.errorMessage = errorResponse;
            });
        }
        
        // Fetch list of all jira ticket status and its work states
        function getJiraWorkStatesConfiguration() {
            var promiseJiraWorkStatesConfiguration = configurationsService.getJiraWorkStatesConfiguration(view_model.selectedProject.id);
            promiseJiraWorkStatesConfiguration.then(function(response) {
                view_model.defaultLeadTimeEndState = response['data']['defaultLeadTimeEndState'];
                view_model.defaultLeadTimeStartState = response['data']['defaultLeadTimeStartState'];
                view_model.jiraWorkStates = response['data']['workStates'];
                // Find the index of default start/end lead time
                for (var i in view_model.jiraWorkStates) {
                    if (view_model.jiraWorkStates[i]['name'] === view_model.defaultLeadTimeStartState) {
                        var start = Number(i);
                        view_model.currentStart = start;
                    } else if (view_model.jiraWorkStates[i]['name'] === view_model.defaultLeadTimeEndState) {
                        var end = Number(i) - 1;
                        view_model.currentEnd = end;
                    }
                    
                    // Give temporary index
                    view_model.jiraWorkStates[i]['index'] = Number(i);

                    // Find status that belongs to the state
                    for (let status in view_model.jiraWorkStates[i]['status']) {
                        let label = view_model.jiraWorkStates[i]['status'][status];
                        view_model.jiraWorkStates[i]['status'][status] = {
                            'label': label,
                            'selected': false,
                        }
                    }
                }
                
                for (var i in view_model.jiraWorkStates) {
                    view_model.jiraWorkStates[i]['selected'] = i >= start && i <= end;
                }
            }).catch(function(errorResponse) {
                view_model.errorMessage = errorResponse;
            });
        }

        // Fetch list of git repositories
        function getGitConfiguration() {
            let promiseProjectRepos = configurationsService.getGitConfiguration(view_model.selectedProject.id);
            promiseProjectRepos.then(function(response) {
                view_model.repos = response['data'];
            }).catch(function(errorResponse) {
                console.log('getGitConfiguration failed');
                view_model.errorMessage = errorResponse;
            });
        }

        // -------------------------------------
        // Functions for UI element interactions
        // -------------------------------------
        // Drag and drop helper function
        function onDrop (srcList, srcIndex, targetList, targetIndex) {
            // Copy the item from source to target.
            targetList.splice(targetIndex, 0, srcList[srcIndex]);
            // Remove the item from the source, possibly correcting the index first.
            // We must do this immediately, otherwise ng-repeat complains about duplicates.
            if (srcList === targetList && targetIndex <= srcIndex) srcIndex++;
            srcList.splice(srcIndex, 1);
            // By returning true from dnd-drop we signalize we already inserted the item.
            return true;
        }

        function onDropStates (srcList, srcIndex, targetList, targetIndex) {
            // Copy the item from source to target.
            targetList.splice(targetIndex, 0, srcList[srcIndex]);
            // Remove the item from the source, possibly correcting the index first.
            // We must do this immediately, otherwise ng-repeat complains about duplicates.
            if (srcList === targetList && targetIndex <= srcIndex) srcIndex++;
            srcList.splice(srcIndex, 1);
            // By returning true from dnd-drop we signalize we already inserted the item.

            // Fix ordering
            // view_model.jiraWorkStates[targetIndex].index = targetIndex;
            
            if(srcIndex > targetIndex) {
                for (var i=targetIndex; i< srcIndex; i++) {
                    view_model.jiraWorkStates[i].index = i;
                }
            } else {
                for (var i=srcIndex; i< targetIndex; i++) {
                    view_model.jiraWorkStates[i].index = i;
                }
            }
            // Fix currentStart and currentEnd
            for (var j=0; j<view_model.jiraWorkStates.length; j++) {
                if (view_model.jiraWorkStates[j].selected) {
                    if (j < view_model.currentStart) {
                        view_model.currentStart = j;
                    } else if (j > view_model.currentEnd) {
                        view_model.currentEnd = j;
                    }
                }
            }
            for (var j=view_model.currentStart; j<=view_model.currentEnd; j++) {
                view_model.jiraWorkStates[j].selected = true;
            }

            return true;
        }

        function sortByKey(array, key) {
            return array.sort(function(a, b) {
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
        
        function selectLeadTime(state) {
            if (view_model.currentEnd === view_model.currentStart) {
                state.selected = true;
            }
             
            if (state.selected) {
                // Reevaluate start/end leadtime when card is selected into to leadtime 
                if (state.index < view_model.currentStart) {
                    view_model.currentStart =  state.index;
                } else if (state.index > view_model.currentEnd) {
                    view_model.currentEnd = state.index;
                }
                
                // fill up gaps
                if (view_model.currentStart < view_model.currentEnd) {
                    for (var i=view_model.currentStart; i<=view_model.currentEnd; i++) {
                        view_model.jiraWorkStates[i].selected = true;
                    }
                } else if (view_model.currentStart > view_model.currentEnd) {
                    for (var i=view_model.currentEnd; i<=view_model.currentStart; i++) {
                        view_model.jiraWorkStates[i].selected = true;
                    }
                }
            } else {
                // Reevaluate start/end leadtime when card is unselected from leadtime
                if (state.index === view_model.currentStart) {
                    view_model.currentStart += 1;
                } else if (state.index === view_model.currentEnd) {
                    view_model.currentEnd -= 1;
                }
            }

        }
        
        function warningToast(message) {
            let el = angular.element(document.querySelector('#toastContainer'));
            $mdToast.show(
                $mdToast.simple()
                    .textContent(message)
                    .parent(el)
                    .action('OK')
                    .highlightAction(true)
                    .highlightClass('md-accent')
                    .position('top right')
                    .hideDelay(5000)
            );
        }
        
        function createNewState() {
            view_model.creatingNewState = true;
        }
        
        function createNewType() {
            view_model.creatingNewType = true;
        }
        
        function cancelNewState() {
            view_model.creatingNewState = false;
        }
        
        function cancelNewType() {
            view_model.creatingNewType = false;
        }
        
        function saveNewState() {
            view_model.newStateError = false;
            
            // Check that state name doesn't already exists
            for (var i in view_model.jiraWorkStates) {
                if (view_model.jiraWorkStates[i]['name'].toLowerCase() === view_model.newStateName.toLowerCase()) {
                    warningToast('State name already exists');
                    view_model.newStateError = true;
                }
            }
            
            if (!view_model.newStateError) {
                view_model.creatingNewState = false;
                
                // move all other elements 
                for (var i in view_model.jiraWorkStates) {
                    view_model.jiraWorkStates[i]['index'] += 1;
                }
                
                // create new state
                let newState = {
                    'status': [],
                    'name': view_model.newStateName,
                    'index': 0,
                    'selected': false
                };
                view_model.jiraWorkStates.unshift(newState); // push new state at the start of array
                view_model.currentEnd += 1;
                view_model.currentStart += 1;
                
                // clear newStateName
                view_model.newStateName = '';
            }
        }

        function saveNewType() {
            view_model.newTypeError = false;
            
            // Check that type name doesn't already exists
            for (var i in view_model.jiraWorkTypes) {
                if (view_model.jiraWorkTypes[i]['workTypeName'].toLowerCase() === view_model.newTypeName.toLowerCase()) {
                    warningToast('Type name already exists');
                    view_model.newTypeError = true;
                }
            }

            if (!view_model.newTypeError) {
                view_model.creatingNewType = false;
                // create new type
                let newType = {
                    'workTypeName': view_model.newTypeName,
                    'issueTypes': []
                };
                view_model.jiraWorkTypes.unshift(newType); // push new state at the start of array

                // clear newStateName
                view_model.newTypeName = '';
                sortByKey(view_model.jiraWorkTypes, 'workTypeName');
            }
        }
        
        function deleteState($event, state) {
            if (state.index >= view_model.currentStart && state.index <= view_model.currentEnd) {
                view_model.currentEnd--;
            }

            $event.stopPropagation(); // prevents clicking delete button from propagating to card selection event
            for (var i=0; i < view_model.jiraWorkStates.length; i++) {
                var obj = view_model.jiraWorkStates[i];
                if (state.name === obj['name']) {
                    view_model.jiraWorkStates.splice(i, 1);
                    i--;
                }
            }
            // iterate through jiraworkstate again and reevaluate order
            for (var i=0; i<view_model.jiraWorkStates.length; i++) {
                view_model.jiraWorkStates[i].index = i;
            }
            
        }
        
        function deleteType(type) {
            for (var i=0; i < view_model.jiraWorkTypes.length; i++) {
                let obj = view_model.jiraWorkTypes[i];
                if (type.workTypeName === obj['workTypeName']) {
                    view_model.jiraWorkTypes.splice(i, 1);
                    i--;
                }
            }
        }
        
        function updateProjectSettings() {
            view_model.loading = true;
            updateIssues();
        }
        
        function updateIssues() {
            // TODO: validate chip input format --> From Projects: GOPS  all caps
            //                                  --> Except For: Epic     first letter uppercase
            // value validation is done on backend/lambda
            
            if(view_model.selectedProject) {
                var promiseUpdateIssues = configurationsService.updateIssues(
                    view_model.selectedProject.id,
                    view_model.boardName,
                    view_model.includeSubtasks,
                    view_model.excludedIssueTypes.join(','),
                    view_model.issueFilter,
                    view_model.selectedProject.name
                );
                promiseUpdateIssues.then(function(response) {
                    if (response['status'] === '200') {
                        updateRepos();
                    }
                }).catch(function(errorResponse){
                    console.log(errorResponse);
                    warningToast(errorResponse['data']['message']);
                }).then(function(){
                    view_model.loading = false;
                });
            }
        }
        
        function updateRepos() {
            if(view_model.selectedProject) {
                let promiseUpdateRepos = configurationsService.updateRepos(view_model.selectedProject.id, view_model.repos);
                promiseUpdateRepos.then(function(response) {
                    warningToast('Saved');
                    setTimeout(function() {
                        $rootScope.selectedProjectId = view_model.selectedProject.id;
                        $rootScope.selectedProjectName = view_model.selectedProject.name;
                        $window.sessionStorage.selectedProjectId = view_model.selectedProject.id;
                        $window.sessionStorage.selectedProjectName = view_model.selectedProject.name;
                        window.location.href = "#!/metrics";
                        window.location.reload()
                    }, 2000)
                }).catch(function(errorResponse){
                    console.log(errorResponse);
                    warningToast(errorResponse['data']['message']);
                });
            }
        }
        
        function updateWorkTypes() {
            view_model.loading = true;
            if(view_model.selectedProject) {
                // Build POST data body
                let workTypePostBody = {};
                for (var i in view_model.jiraWorkTypes) {
                    var issueList = [];
                    for (var j in view_model.jiraWorkTypes[i].issueTypes) {
                        issueList.push(view_model.jiraWorkTypes[i].issueTypes[j].label);
                    }
                    workTypePostBody[view_model.jiraWorkTypes[i].workTypeName] = issueList;
                }
                let promiseUpdateWorkTypes = configurationsService.updateWorkTypes(view_model.selectedProject.id, workTypePostBody);
                promiseUpdateWorkTypes.then(function(response) {
                    if (response['status'] === '200') {
                        warningToast('Saved!');
                    }
                    
                }).catch(function(errorResponse){
                    console.log(errorResponse);
                    warningToast(errorResponse['data']['message']);
                }).then(function() {
                    view_model.loading = false;
                });
            }
        }
        
        function resetToBoard() {
            view_model.loading = true;
            var promiseBoardWorkStatesConfiguration = configurationsService.getBoardWorkStatesConfiguration(view_model.selectedProject.id);
            promiseBoardWorkStatesConfiguration.then(function(response) {
                if (response['status'] === '200') {
                    view_model.defaultLeadTimeEndState = response['data']['defaultLeadTimeEndState']; 
                    view_model.defaultLeadTimeStartState = response['data']['defaultLeadTimeStartState'];
                    view_model.jiraWorkStates = response['data']['workStates'];
                    // Find the index of default start/end lead time
                    for (var i in view_model.jiraWorkStates) {
                        if (view_model.jiraWorkStates[i]['name'] === view_model.defaultLeadTimeStartState) {
                            var start = Number(i);
                            view_model.currentStart = start;
                        } else if (view_model.jiraWorkStates[i]['name'] === view_model.defaultLeadTimeEndState) {
                            var end = Number(i) - 1;
                            view_model.currentEnd = end;
                        }
                    
                        // Give temporary index
                        view_model.jiraWorkStates[i]['index'] = Number(i);
                    
                        // Find status that belongs to the state
                        for (var status in view_model.jiraWorkStates[i]['status']) {
                            var label = view_model.jiraWorkStates[i]['status'][status];
                            view_model.jiraWorkStates[i]['status'][status] = {
                                'label': label,
                                'selected': false,
                            }
                        }
                    }
                    
                    for (var i in view_model.jiraWorkStates) {
                        view_model.jiraWorkStates[i]['selected'] = i >= start && i <= end;
                    }
                    warningToast('Reverted to board configuration! Click the save button to keep all changes.');
                }
            }).catch(function(errorResponse){
                console.log(errorResponse);
                warningToast(errorResponse['data']['message']);
            }).then(function() {
                view_model.loading = false;
            });
        }
        
        function updateWorkStates() {
            view_model.loading = true;
            if(view_model.selectedProject) {
                // Build POST data body
                let workStates = [];
                let defaultLeadTimeStart = view_model.jiraWorkStates.length;
                let defaultLeadTimeEnd = 0;
                for (var i in view_model.jiraWorkStates) {
                    if (view_model.jiraWorkStates[i].selected) {

                        if (defaultLeadTimeStart > view_model.jiraWorkStates[i].index) {
                            defaultLeadTimeStart = view_model.jiraWorkStates[i].index;
                            view_model.defaultLeadTimeStartState = view_model.jiraWorkStates[i].name;
                        }
                        if (defaultLeadTimeEnd < view_model.jiraWorkStates[i].index + 1) {
                            defaultLeadTimeEnd = view_model.jiraWorkStates[i].index + 1;
                            view_model.defaultLeadTimeEndState = view_model.jiraWorkStates[parseInt(i)+1].name;
                        }
                    }
                    let statusList = [];
                    for (var j in view_model.jiraWorkStates[i].status) {
                        statusList.push(view_model.jiraWorkStates[i].status[j].label);
                    }
                    workStates.push({
                        'status': statusList,
                        'name': view_model.jiraWorkStates[i].name
                    });
                }

                let workStatePostBody = {
                    'defaultLeadTimeStartState': view_model.defaultLeadTimeStartState,
                    'defaultLeadTimeEndState': view_model.defaultLeadTimeEndState,
                    'workStates': workStates
                };
                let promiseUpdateWorkStates = configurationsService.updateWorkStates(view_model.selectedProject.id, workStatePostBody);
                promiseUpdateWorkStates.then(function(response) {
                    if (response['status'] === '200') {
                        warningToast('Saved!');
                    }
                }).catch(function(errorResponse){
                    console.log(errorResponse);
                    warningToast(errorResponse['data']['message']);
                }).then(function() {
                    view_model.loading = false;
                });
            }
        }

        function resetJQLToBoard() {
            if (view_model.boardName) {
                let JQLPromise = configurationsService.getBoardJQL(view_model.boardName);
                JQLPromise.then(function(response) {
                    view_model.issueFilter = response['data']['issue_filter'];
                    getIssueFilter(view_model.issueFilter);
                }).catch(function(errorResponse) {
                    console.log(errorResponse);
                    warningToast(errorResponse['data']['message']);
                })
            } else {
                warningToast("Missing board name!")
            }
        }

        function projectETL() {
            let projectETLPromise = configurationsService.projectETL(view_model.selectedProject.id, false);
            projectETLPromise.then(function(response) {
                warningToast("Successfully triggered ETL for " + view_model.selectedProject.name + ". Please come back later when data gets loaded.");
                view_model.disableETL = true;
            }).catch(function(errorResponse) {
                warningToast(errorResponse.data)
            })
        }

        function issueTypeETL() {
            let issueTypeETLPromise = configurationsService.projectETL(view_model.selectedProject.id, true);
            issueTypeETLPromise.then(function(response) {
                warningToast("Successfully triggered issue type ETL.");
                setTimeout(function() {
                    window.location.reload()
                }, 2500)
            }).catch(function(errorResponse) {
                warningToast(errorResponse.data)
            })
        }

        function getETLStatus() {
            let etlStatusPromise = configurationsService.etlStatus(view_model.selectedProject.id);
            etlStatusPromise.then(function(response) {
                let last_etl_run = response["data"]["last_etl_run"];
                let current_time = new Date().getTime() / 1000;
                if (last_etl_run != null && (current_time - last_etl_run) < 300) {
                    view_model.disableETL = true;
                }
            })
        }
    }

})();