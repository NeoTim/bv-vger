//--------------------------------—--------------------------------—--------------------------------—//
//CONSTANTS
//These are the fiscal quarter end dates for bazaarvoice that are used in quarterly reports.
//If your company has different quarterly end dates, you can modify them here
import {JIRA_HOST_URL} from "../../shared/constants";

const QUARTER_DATES_ORGANIZED = ["1/31", "4/30", "7/31", "10/31"];

//if arranged chronologically by quarter, optimizes loop that assigns it
const DATE_TO_QUARTER = [{date:"7/31", quarter:"Q1"}, {date:"10/31", quarter:"Q2"}, {date:"1/31", quarter:"Q3"}, {date:"4/30", quarter:"Q4"}];

//------END OF:  Q1,      Q2,     Q3,     Q4 --------------- //
//quarterDates: ["7/31", "10/31", "1/31", "4/31"],
// JUST FOR PURPOSES OF ILLUSTRATING WHEN FISCAL QUARTERS FALL

const THROUGHPUT_OPTIONS = {
  curveType: '',
  legend: { position: 'top' },
  series: {
   0: {lineWidth: 3, pointShape: 'circle', pointSize: 7},
   1: {lineWidth: 0 , pointSize: 0},
   2: { lineWidth: 1, lineDashStyle: [10, 2], pointShape: 'triangle', pointSize: 10 },
   3: { lineWidth: 1, lineDashStyle: [10, 2], pointShape: 'square', pointSize: 10 },
   4: { lineWidth: 1, lineDashStyle: [10, 2], pointShape: 'diamond', pointSize: 10 }
  },
  pointSize: 5,
  colors: ['#000', '#FFF','#006400', '#808000', '#cc8400'],
  focusTarget: 'category',
  // tooltip: { isHtml: true },
  vAxis: {
    title: "Issues Completed",
    titleTextStyle: {
      italic: false
    },
    gridlines: {},
  },
  animation: {
      duration: 1500,
      startup: true
  },
  hAxis: {
    title: 'Quarters',
    titleTextStyle: {
        italic: false
    },
    chartArea: {
      // leave room for y-axis labels
      height: '80%',
      width: '80%'
    },
  },
};

const THROUGHPUT_COLUMNS = [
  {
    type: 'string',
    label: 'Quarters',
  },
  {
    type: 'number',
    label: 'Actual',
  },        
  {
    type: 'number',
    label: 'Likeliness',
  },        
  {
    type: 'number',
    label: '90%',
  },        
  {
    type: 'number',
    label: '80%',
  },        
  {
    type: 'number',
    label: '50%',
  }
];

const LEAD_TIME_OPTIONS = {
  curveType: '',
  legend: 'none',
  series: {
   0: {pointShape: 'circle', pointSize: 7},
  },
  colors: ['#000'], 

  explorer: { 
    maxZoomIn: 0.0001, 
    zoomDelta: 0.0001,
    actions: ['dragToZoom', 'rightClickToReset'],
    keepInBounds: true,
  },
  tooltip: { 
    isHtml: true,
    trigger: 'focus'
  },
  vAxis: {
    title: "Working Days",
    titleTextStyle: {
      italic: false
    },
    gridlines: {
        //color: 'none'
        color: '##CCC',
    },
    baseline:0
  },
  hAxis: {
    ticks: {},
    gridlines: {
        color: '#CCC',
    },
    title: 'End Dates',
    titleTextStyle: {
        italic: false
    },
    format: 'MM/dd/yyyy',
  },
  crosshair: { trigger: 'focus' },
  animation: {
      duration: 1500,
      startup: true
  },
  chartArea: {
      // leave room for y-axis labels
      height: '80%',
      width: '80%'
  },
};

const LEAD_TIME_COLUMNS = [
  {
    type: 'date',
    label: 'Days',
  },
  {
    type: 'number',
    label: 'Number of Working Days',
  },
  {
    type: 'string', 
    role: 'tooltip', 
    p: {'html': true},
  }     
];

import * as shared_constants from '../../shared/constants.js';

let constants = {
  QUARTER_DATES_ORGANIZED: QUARTER_DATES_ORGANIZED,
  DATE_TO_QUARTER: DATE_TO_QUARTER,
  THROUGHPUT_COLUMNS: THROUGHPUT_COLUMNS,
  THROUGHPUT_OPTIONS: THROUGHPUT_OPTIONS,
  LEAD_TIME_COLUMNS: LEAD_TIME_COLUMNS,
  LEAD_TIME_OPTIONS: LEAD_TIME_OPTIONS,
  JIRA_URL: shared_constants.JIRA_HOST_URL,
  API_GATEWAY_URL: shared_constants.API_GATEWAY_URL,
};

//--------------------------------—--------------------------------—--------------------------------—//
export {constants};
