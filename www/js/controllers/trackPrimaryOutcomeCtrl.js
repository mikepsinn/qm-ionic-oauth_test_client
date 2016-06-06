angular.module('starter')

    // Controls the Track Page of the App
    .controller('TrackPrimaryOutcomeCtrl', function($scope, $ionicModal, $state, $timeout, utilsService, authService, 
                                                    measurementService, chartService, $ionicPopup, localStorageService,
                                                    $rootScope, $ionicLoading, ratingService) {
        $scope.controller_name = "TrackPrimaryOutcomeCtrl";

        $scope.showCharts = false;
        $scope.showRatingFaces = true;

        $scope.storeRatingLocalAndServerAndUpdateCharts = function (numericRatingValue) {

            // flag for blink effect
            $scope.timeRemaining = true;
            $scope.showRatingFaces = false;

            if (window.chrome && window.chrome.browserAction) {
                chrome.browserAction.setBadgeText({
                    text: ""
                });
            }

            // update local storage
            measurementService.addToMeasurementsQueue(numericRatingValue);

            if(!$rootScope.isSyncing){
                syncPrimaryOutcomeVariableMeasurements();
            }
            updateCharts();
           
        };

        // Update primary outcome variable images via an integer
        var updateAveragePrimaryOutcomeRatingView = function(numericRatingValue){
            var averageRatingText =
                config.appSettings.ratingValueToTextConversionDataSet[numericRatingValue];
            if(averageRatingText){
                $scope.averagePrimaryOutcomeVariableImage = ratingService.getRatingFaceImageByText(averageRatingText);
                $scope.averagePrimaryOutcomeVariableText = averageRatingText;
                console.log("updated averagePrimaryOutcomeVariableRating view");
            }

            if(!$scope.$$phase) {
                $scope.showRatingFaces = true;
                console.log("Not in the middle of digest cycle, so redrawing everything...");
                $scope.safeApply();
            }
        };


        var updateBarChart = function(arr){
            $scope.redrawBarChart = false;
            console.log("re-drawing bar chart");

            console.log("load config object chartService.configureBarChart");
            $scope.barChartConfig = chartService.configureBarChart(arr);

            // Fixes chart width
            $scope.$broadcast('highchartsng.reflow');
            console.log("redraw chart with new data");
            $scope.redrawBarChart = true;
        };

        var updateLineChart = function(lineChartData){
            $scope.redrawLineChart = false;
            console.log("Configuring line chart...");
            $scope.lineChartConfig = chartService.configureLineChart(lineChartData);

            // Fixes chart width
            $scope.$broadcast('highchartsng.reflow');

            // redraw chart with new data
            $scope.redrawLineChart = true;

        };

        // updates all the visual elements on the page
        var updateCharts = function(){
            localStorageService.getItem('averagePrimaryOutcomeVariableValue',function(averagePrimaryOutcomeVariableValue){
                var __ret = measurementService.getLineAndBarChartData();
                if(__ret){
                    if(!$scope.barChartConfig || __ret.barArr !== $scope.barChartConfig.series[0].data){
                        updateAveragePrimaryOutcomeRatingView(averagePrimaryOutcomeVariableValue);
                        $scope.lineChartData = __ret.lineArr;
                        $scope.barChartData = __ret.barArr;
                        updateLineChart($scope.lineChartData);
                        updateBarChart($scope.barChartData);
                        $scope.showCharts = true;
                        if(!$scope.$$phase) {
                            $scope.safeApply();
                        }
                    }
                }
            });
        };

        // calculate values for both of the charts
        var calculateChartValues = function(){
            measurementService.calculateBothChart().then($ionicLoading.hide());
        };

        // calculate values for both of the charts
        var syncPrimaryOutcomeVariableMeasurements = function(){

            if($rootScope.user){
                $rootScope.isSyncing = true;
                console.log('Syncing primary outcome measurements...');

                measurementService.syncPrimaryOutcomeVariableMeasurements().then(function(){
                    console.log("Measurement sync complete!");
                    $rootScope.isSyncing = false;

                    // update loader text
                    $ionicLoading.hide();
                    $scope.showLoader('Calculating stuff', 2000);

                    // calculate primary outcome variable values
                    measurementService.calculateAveragePrimaryOutcomeVariableValue().then(function(){
                        measurementService.getPrimaryOutcomeVariableValue().then(calculateChartValues, calculateChartValues);
                        updateCharts();
                    });
                });
            }
        };

        $scope.init = function(){

            // flags
            $scope.timeRemaining = false;
            $scope.averagePrimaryOutcomeVariableImage = false;
            $scope.averagePrimaryOutcomeVariableValue = false;
            $scope.lineChartData = null;
            $scope.barChartData = null;

            // chart flags
            $scope.lineChartConfig = false; 
            $scope.barChartConfig = false;
            $scope.redrawLineChart = true;
            $scope.redrawBarChart = true;
            $scope.showHelpInfoPopupIfNecessary();
            syncPrimaryOutcomeVariableMeasurements();
            $ionicLoading.hide();
        };

        $scope.init();

        $scope.$on('updateChartsAndSyncMeasurements', function(){
            console.log('track state redrawing event triggered through sibling controllers. Updating charts and syncing..');
            if(!$scope.lineChartConfig){
                updateCharts();
            }
            syncPrimaryOutcomeVariableMeasurements();
        });

        $scope.$on('$ionicView.enter', function(e) {
            console.log('track state brought in focus. Updating charts and syncing..');
            if(!$scope.lineChartConfig){
                updateCharts();
            }
            syncPrimaryOutcomeVariableMeasurements();
            $timeout(function() {
                $scope.$broadcast('highchartsng.reflow');
            }, 10);
        });
    });