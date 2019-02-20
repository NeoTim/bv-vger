/*
 * Share date $scope between dateController and other controllers
 */

(function() {
    'use strict';

    angular.module('vgerDateService', [])
    .factory('dateService', dateService);

    function dateService() {
        let data = {
            dateSince: '',
            dateUntil: '',
            days: 0
        };

        return {
            getDateSince: getDateSince,
            setDateSince: setDateSince,
            getDateUntil: getDateUntil,
            setDateUntil: setDateUntil,
            getDays: getDays,
            setDays: setDays
        };

        function getDateSince() {
            return data.dateSince;
        }
        
        function setDateSince(dateSince) {
            data.dateSince = dateSince;
        }
        
        function getDateUntil() {
            return data.dateUntil;
        }
        
        function setDateUntil(dateUntil) {
            data.dateUntil = dateUntil;
        }
        
        function getDays() {
            return data.days;
        }
        
        function setDays(days) {
            data.days = days;
        }
    }
})();
