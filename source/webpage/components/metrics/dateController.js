/*
 * Date helper functions
 */
 
(function(){
    'use strict';
    
    angular.module('vgerDateController', [])
    .controller('datePickerController', datePickerController);
    
    datePickerController.$inject = ['$scope', 'dateService', '$rootScope'];
    function datePickerController ($scope, dateService, $rootScope) {
        let view_model = this;
        
        // Initialize default values
        if (!$rootScope.savedSearch) {
            dateService.setDateSince(new Date(new Date().setDate(new Date().getDate() - 90))); // o_o;;
            dateService.setDateUntil(new Date()); 
            dateService.setDays(90); // default interval of 90 days
        } 

        
        // Populate view-model
        view_model.dateSince = dateService.getDateSince();
        view_model.dateUntil = dateService.getDateUntil();
        view_model.days = dateService.getDays();
        view_model.error = false;
        view_model.update = update;
        view_model.dateChange = dateChange;
        view_model.open1 = open1;
        view_model.open2 = open2;
        view_model.format = 'yyyy-MM-dd';
        view_model.dateSinceOptions = {
            maxDate: new Date(dateService.getDateUntil().getTime() - (1000 * 60 * 60 * 24 * 14)) // subtract 14 days
        };
        view_model.dateUntilOptions = {
            minDate: new Date(dateService.getDateSince().getTime() + (1000 * 60 * 60 * 24 * 14)), // add 14 days
            maxDate: new Date()
        };
        view_model.popup1 = {
            opened: false
        };
        view_model.popup2 = {
            opened: false
        };

        // Helper function to control max/min date allowed while keeping the minimum interval to 14 days
        function dateChange(newDate, type) {
            view_model.error = false; // reset and check for error again upon change
            if (type === 'dateSince') {
                if (newDate <= view_model.dateSinceOptions.maxDate) {
                    dateService.setDateSince(newDate);
                    view_model.dateUntilOptions.minDate = new Date(dateService.getDateSince().getTime() + (1000 * 60 * 60 * 24 * 14));
                } else {
                    view_model.dateSince = dateService.getDateSince();  // out of range; correct it to original value
                }
            } else if (type === 'dateUntil') {
                if (newDate >= view_model.dateUntilOptions.minDate && newDate <= view_model.dateUntilOptions.maxDate) {
                    dateService.setDateUntil(newDate);
                    view_model.dateSinceOptions.maxDate = new Date(dateService.getDateUntil().getTime() - (1000 * 60 * 60 * 24 * 14));
                } else {
                    view_model.dateUntil = dateService.getDateUntil();  //out of range; correct to original value
                }
            } else if (type ===  'days') {
                if (newDate < 14) {
                    view_model.error = true; // minimum 14 days interval
                } 
                dateService.setDateSince(new Date(dateService.getDateUntil().getTime() - (1000 * 60 * 60 * 24 * newDate)));
                view_model.dateSince = dateService.getDateSince();
                view_model.dateUntilOptions.minDate = new Date(dateService.getDateSince().getTime() + (1000 * 60 * 60 * 24 * 14));
            }
            dateService.setDays(daysBetween(dateService.getDateSince(),dateService.getDateUntil()));
            view_model.days = dateService.getDays();
            if (view_model.days < 14) {
                view_model.error = true;
            }
        }
        
        // dateSince popup
        function open1() {
            view_model.popup1.opened = true;
        }
        // dateUntil popup
        function open2() {
            view_model.popup2.opened = true;
        }
        function daysBetween(date1, date2) {
            let one_day = 1000 * 60 * 60 * 24;                // Get 1 day in milliseconds
            let date1_ms = date1.getTime();                   // Convert both dates to milliseconds
            let date2_ms = date2.getTime();
            let difference_ms = date2_ms - date1_ms;          // Calculate the difference in milliseconds
            return Math.round(difference_ms/one_day);      // Convert back to days and return
        }
        
        function update() {
            view_model.dateSince = dateService.getDateSince();
            view_model.dateUntil = dateService.getDateUntil();
        }
    }
})();
