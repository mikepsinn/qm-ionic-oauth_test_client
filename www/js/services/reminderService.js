angular.module('starter')
	// Measurement Service
	.factory('reminderService', function($q, $rootScope, quantimodoService, timeService, notificationService,
										 localStorageService, $timeout) {

		var reminderService = {};
		var delayBeforePostingNotifications = 60 * 1000;

		reminderService.postTrackingRemindersDeferred = function(trackingRemindersArray){
			var deferred = $q.defer();
			quantimodoService.postTrackingRemindersToApi(trackingRemindersArray, function(){
				//update alarms and local notifications
				console.debug("remindersService:  Finished postTrackingReminder so now refreshTrackingRemindersAndScheduleAlarms");
				reminderService.refreshTrackingRemindersAndScheduleAlarms();
				deferred.resolve();
			}, function(error){
				deferred.reject(error);
			});

			return deferred.promise;
		};

		reminderService.postTrackingReminderNotificationsDeferred = function(successHandler, errorHandler){
			var deferred = $q.defer();
			var trackingReminderNotificationsArray = localStorageService.getItemAsObject('notificationsSyncQueue');
			if(!trackingReminderNotificationsArray){
                if(successHandler){
                    successHandler();
                }
				deferred.resolve();
				return deferred.promise;
			}
			quantimodoService.postTrackingReminderNotificationsToApi(trackingReminderNotificationsArray, function(){
				localStorageService.deleteItem('notificationsSyncQueue');
                if($rootScope.showUndoButton){
                    $rootScope.showUndoButton = false;
                }
                if(successHandler){
                    successHandler();
                }
				deferred.resolve();
			}, function(error){
                if(errorHandler){
                    errorHandler();
                }
				deferred.reject(error);
			});

			return deferred.promise;
		};


		reminderService.skipReminderNotificationDeferred = function(body){
			var deferred = $q.defer();
			reminderService.deleteNotificationFromLocalStorage(body);
			body.action = 'skip';
			localStorageService.addToOrReplaceElementOfItemByIdOrMoveToFront('notificationsSyncQueue', body);
            $timeout(function() {
                // Post notification queue in 5 minutes if it's still there
                reminderService.postTrackingReminderNotificationsDeferred();
            }, delayBeforePostingNotifications);
/*
			quantimodoService.skipTrackingReminderNotification(body, function(response){
				if(response.success) {
					deferred.resolve();
				}
				else {
					deferred.reject();
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});
*/
			return deferred.promise;
		};

		reminderService.skipAllReminderNotificationsDeferred = function(params){
			var deferred = $q.defer();
			localStorageService.deleteItem('trackingReminderNotifications');
			quantimodoService.skipAllTrackingReminderNotifications(params, function(response){
				if(response.success) {
					deferred.resolve();
				}
				else {
					deferred.reject();
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});

			return deferred.promise;
		};

		reminderService.trackReminderNotificationDeferred = function(body){
			var deferred = $q.defer();
			console.debug('reminderService.trackReminderNotificationDeferred: Going to track ' + JSON.stringify(body));
			reminderService.deleteNotificationFromLocalStorage(body);
			body.action = 'track';
			localStorageService.addToOrReplaceElementOfItemByIdOrMoveToFront('notificationsSyncQueue', body);
            $timeout(function() {
                // Post notification queue in 5 minutes if it's still there
                reminderService.postTrackingReminderNotificationsDeferred();
            }, delayBeforePostingNotifications);
/*
			quantimodoService.trackTrackingReminderNotification(body, function(response){
				if(response.success) {
					deferred.resolve();
				}
				else {
					deferred.reject();
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});
*/

			return deferred.promise;
		};

		reminderService.snoozeReminderNotificationDeferred = function(body){
			var deferred = $q.defer();
			reminderService.deleteNotificationFromLocalStorage(body);
			body.action = 'snooze';
			localStorageService.addToOrReplaceElementOfItemByIdOrMoveToFront('notificationsSyncQueue', body);
            $timeout(function() {
                // Post notification queue in 5 minutes if it's still there
                reminderService.postTrackingReminderNotificationsDeferred();
            }, delayBeforePostingNotifications);

/*
			quantimodoService.snoozeTrackingReminderNotification(body, function(response){
				if(response.success) {
					deferred.resolve();
				}
				else {
					deferred.reject();
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});
*/

			return deferred.promise;
		};

		reminderService.getTrackingRemindersDeferred = function(variableCategoryName) {
			var deferred = $q.defer();
			reminderService.getTrackingRemindersFromLocalStorage(variableCategoryName)
				.then(function (trackingReminders) {
					if (trackingReminders) {
						deferred.resolve(trackingReminders);
					} else {
						reminderService.refreshTrackingRemindersAndScheduleAlarms.then(function () {
							reminderService.getTrackingRemindersFromLocalStorage(variableCategoryName)
								.then(function (trackingReminders) {
									deferred.resolve(trackingReminders);
								});
						});
					}
				});
			return deferred.promise;
		};

		reminderService.refreshTrackingRemindersAndScheduleAlarms = function(){

			if($rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise){
				var deferred = $q.defer();
				console.warn('Already refreshTrackingRemindersAndScheduleAlarms within last 10 seconds! Rejecting promise!');
				deferred.reject('Already refreshTrackingRemindersAndScheduleAlarms within last 10 seconds! Rejecting promise!');
				return deferred.promise;
			}

			$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = $q.defer();

				console.debug('Setting lastRefreshTrackingRemindersAndScheduleAlarmsPromise timeout');
				$timeout(function() {
					// Set to false after 30 seconds because it seems to get stuck on true sometimes for some reason
					var  message = '30 seconds elapsed before lastRefreshTrackingRemindersAndScheduleAlarmsPromise resolving';
					if($rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise){
						$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.reject(message);
						$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
						console.error('Set lastRefreshTrackingRemindersAndScheduleAlarmsPromise to null because ' + message);
					}
				}, delayBeforePostingNotifications);

				var params = {
					limit: 200
				};

				quantimodoService.getTrackingRemindersFromApi(params, function(remindersResponse){
					var trackingReminders = remindersResponse.data;
					if(remindersResponse.success) {
						if($rootScope.user){
							if($rootScope.user.combineNotifications !== true){
								try {
									if($rootScope.localNotificationsEnabled){
										notificationService.scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes(trackingReminders);
									}
								} catch (exception) { if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
									console.error('scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes error: ');
								}
								//notificationService.scheduleAllNotificationsByTrackingReminders(trackingReminders);
							} else {
								try {
									if($rootScope.localNotificationsEnabled){
										notificationService.scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes(trackingReminders);
									}
								} catch (exception) { if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
									console.error('scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes error');
								}
							}
						} else {
							var error = 'No $rootScope.user in successful quantimodoService.getTrackingRemindersFromApi callback! How did this happen?';
							if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
						}

						localStorageService.setItem('trackingReminders', JSON.stringify(trackingReminders));
						$rootScope.$broadcast('getFavoriteTrackingRemindersFromLocalStorage');
						$rootScope.syncingReminders = false;
						if($rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise){
							$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.resolve(trackingReminders);
							$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
							console.debug('Resolved and set lastRefreshTrackingRemindersAndScheduleAlarmsPromise to null');
						} else {
							console.error('lastRefreshTrackingRemindersAndScheduleAlarmsPromise was deleted before we could resolve it!');
						}
					}
					else {
						$rootScope.syncingReminders = false;
						$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.reject(
							'No success from getTrackingReminders request');
						$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
						console.error('Set lastRefreshTrackingRemindersAndScheduleAlarmsPromise to null');
					}
				}, function(error){
					$rootScope.syncingReminders = false;
					if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
					$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.reject(error);
					$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
					console.error('Set lastRefreshTrackingRemindersAndScheduleAlarmsPromise to null: ' + JSON.stringify(error));
				});

				return $rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.promise;
		};

		reminderService.getTodayTrackingReminderNotificationsDeferred = function(variableCategoryName){
			var params = {
				minimumReminderTimeUtcString : timeService.getLocalMidnightInUtcString(),
				maximumReminderTimeUtcString : timeService.getTomorrowLocalMidnightInUtcString(),
				sort : 'reminderTime'
			};
			if (variableCategoryName) {
				params.variableCategoryName = variableCategoryName;
			}
			var deferred = $q.defer();
			quantimodoService.getTrackingReminderNotificationsFromApi(params, function(response){
				if(response.success) {
					var trackingRemindersNotifications =
						quantimodoService.attachVariableCategoryIcons(response.data);
					$rootScope.numberOfPendingNotifications = trackingRemindersNotifications.length;
					deferred.resolve(trackingRemindersNotifications);
				}
				else {
					deferred.reject("error");
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});

			return deferred.promise;
		};

		reminderService.getTrackingReminderNotificationsDeferred = function(variableCategoryName){
			var deferred = $q.defer();
			var trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
				'trackingReminderNotifications', 'variableCategoryName', variableCategoryName);
			if(trackingReminderNotifications && trackingReminderNotifications.length){
				$rootScope.numberOfPendingNotifications = trackingReminderNotifications.length;
				if (window.chrome && window.chrome.browserAction && !variableCategoryName) {
					chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
				}
				deferred.resolve(trackingReminderNotifications);
			} else {
				$rootScope.numberOfPendingNotifications = 0;
				reminderService.refreshTrackingReminderNotifications().then(function () {
					trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
						'trackingReminderNotifications', 'variableCategoryName', variableCategoryName);
					deferred.resolve(trackingReminderNotifications);
				}, function(error){
					deferred.reject(error);
				});
			}
			return deferred.promise;
		};

		var canWeMakeRequestYet = function(type, baseURL, minimumSecondsBetweenRequests){
			var requestVariableName = 'last_' + type + '_' + baseURL.replace('/', '_') + '_request_at';
			if(!$rootScope[requestVariableName]){
				$rootScope[requestVariableName] = Math.floor(Date.now() / 1000);
				return true;
			}
			if($rootScope[requestVariableName] > Math.floor(Date.now() / 1000) - minimumSecondsBetweenRequests){
				console.debug('Cannot make ' + type + ' request to ' + baseURL + " because " +
					"we made the same request within the last " + minimumSecondsBetweenRequests + ' seconds');
				return false;
			}
			$rootScope[requestVariableName] = Math.floor(Date.now() / 1000);
			return true;
		};

		reminderService.refreshTrackingReminderNotifications = function(){
			var deferred = $q.defer();
			var minimumSecondsBetweenRequests = 3;
			if(!canWeMakeRequestYet('GET', 'refreshTrackingReminderNotifications', minimumSecondsBetweenRequests)){
				deferred.reject('Already called refreshTrackingReminderNotifications within last ' +
					minimumSecondsBetweenRequests + ' seconds!  Rejecting promise!');
				return deferred.promise;
			}

			reminderService.postTrackingReminderNotificationsDeferred(function(){
				var currentDateTimeInUtcStringPlus5Min = timeService.getCurrentDateTimeInUtcStringPlusMin(5);
				var params = {};
				params.reminderTime = '(lt)' + currentDateTimeInUtcStringPlus5Min;
				params.sort = '-reminderTime';
				quantimodoService.getTrackingReminderNotificationsFromApi(params, function(response){
					if(response.success) {
						var trackingRemindersNotifications =
							quantimodoService.attachVariableCategoryIcons(response.data);
						$rootScope.numberOfPendingNotifications = trackingRemindersNotifications.length;
						if (window.chrome && window.chrome.browserAction) {
							chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
						}
						localStorageService.setItem('trackingReminderNotifications', JSON.stringify(trackingRemindersNotifications));
						$rootScope.refreshingTrackingReminderNotifications = false;
						$rootScope.$broadcast('getTrackingReminderNotificationsFromLocalStorage');
						deferred.resolve(trackingRemindersNotifications);
					}
					else {
						$rootScope.refreshingTrackingReminderNotifications = false;
						deferred.reject("error");
					}
				}, function(error){
					if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
					$rootScope.refreshingTrackingReminderNotifications = false;
					deferred.reject(error);
				});
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				$rootScope.refreshingTrackingReminderNotifications = false;
				deferred.reject(error);
			});

			return deferred.promise;
		};

		reminderService.getTrackingReminderByIdDeferred = function(reminderId){
			var deferred = $q.defer();
			var params = {id : reminderId};
			quantimodoService.getTrackingRemindersFromApi(params, function(remindersResponse){
				var trackingReminders = remindersResponse.data;
				if(remindersResponse.success) {
					deferred.resolve(trackingReminders);
				}
				else {
					deferred.reject("error");
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});
			return deferred.promise;
		};

		reminderService.getCurrentTrackingReminderNotificationsFromApi = function(category, today){

			var localMidnightInUtcString = timeService.getLocalMidnightInUtcString();
			var currentDateTimeInUtcString = timeService.getCurrentDateTimeInUtcString();
			var params = {};
			if(today && !category){
				var reminderTime = '(gt)' + localMidnightInUtcString;
				params = {
					reminderTime : reminderTime,
					sort : 'reminderTime'
				};
			}

			if(!today && category){
				params = {
					variableCategoryName : category,
					reminderTime : '(lt)' + currentDateTimeInUtcString
				};
			}

			if(today && category){
				params = {
					reminderTime : '(gt)' + localMidnightInUtcString,
					variableCategoryName : category,
					sort : 'reminderTime'
				};
			}

			if(!today && !category){
				params = {
					reminderTime : '(lt)' + currentDateTimeInUtcString
				};
			}

			var deferred = $q.defer();

			var successHandler = function(trackingReminderNotifications) {
				if (trackingReminderNotifications.success) {
					deferred.resolve(trackingReminderNotifications.data);
				}
				else {
					deferred.reject("error");
				}
			};

			var errorHandler = function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			};


			quantimodoService.get('api/v1/trackingReminderNotifications',
				['variableCategoryName', 'id', 'sort', 'limit','offset','updatedAt', 'reminderTime'],
				params,
				successHandler,
				errorHandler);

			return deferred.promise;
		};

		reminderService.getTrackingReminderNotificationsDeferredFromLocalStorage = function(category, today){

			var localMidnightInUtcString = timeService.getLocalMidnightInUtcString();
			var currentDateTimeInUtcString = timeService.getCurrentDateTimeInUtcString();
			var trackingReminderNotifications = [];

			if(today && !category){
				trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
					'trackingReminderNotifications', null, null, null, null, 'reminderTime', localMidnightInUtcString);
				var reminderTime = '(gt)' + localMidnightInUtcString;
			}

			if(!today && category){
				trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
					'trackingReminderNotifications', 'variableCategoryName', category, 'reminderTime', currentDateTimeInUtcString, null, null);
			}

			if(today && category){
				trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
					'trackingReminderNotifications', 'variableCategoryName', category, null, null, 'reminderTime', localMidnightInUtcString);
			}

			if(!today && !category){
				trackingReminderNotifications = localStorageService.getElementsFromItemWithFilters(
					'trackingReminderNotifications', null, null, 'reminderTime', currentDateTimeInUtcString, null, null);
			}

			return trackingReminderNotifications;
		};

		reminderService.deleteTrackingReminderDeferred = function(reminderId){
			var deferred = $q.defer();

			if($rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise){
				var message = 'Got deletion request before last reminder refresh completed';
				console.debug(message);
				$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.reject();
				$rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
				$rootScope.syncingReminders = false;
			}

			localStorageService.deleteElementOfItemById('trackingReminders', reminderId);

			quantimodoService.deleteTrackingReminder(reminderId, function(response){
				if(response.success) {
					//update alarms and local notifications
					console.debug("remindersService:  Finished deleteReminder so now refreshTrackingRemindersAndScheduleAlarms");
					reminderService.refreshTrackingRemindersAndScheduleAlarms();
                    // No need to do this for favorites so we do it at a higher level
					//reminderService.refreshTrackingReminderNotifications();
					deferred.resolve();
				}
				else {
					deferred.reject();
				}
			}, function(error){
				if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
				deferred.reject(error);
			});

			return deferred.promise;
		};

		reminderService.addRatingTimesToDailyReminders = function(reminders) {
			var index;
			for (index = 0; index < reminders.length; ++index) {
				if (reminders[index].valueAndFrequencyTextDescription.indexOf('daily') > 0 &&
					reminders[index].valueAndFrequencyTextDescription.indexOf(' at ') === -1 &&
					reminders[index].valueAndFrequencyTextDescription.toLowerCase().indexOf('disabled') === -1) {
					reminders[index].valueAndFrequencyTextDescription =
						reminders[index].valueAndFrequencyTextDescription + ' at ' +
						reminderService.convertReminderTimeStringToMoment(reminders[index].reminderStartTime).format("h:mm A");
				}
			}
			return reminders;
		};

		reminderService.convertReminderTimeStringToMoment = function(reminderTimeString) {
			var now = new Date();
			var hourOffsetFromUtc = now.getTimezoneOffset()/60;
			var parsedReminderTimeUtc = reminderTimeString.split(':');
			var minutes = parsedReminderTimeUtc[1];
			var hourUtc = parseInt(parsedReminderTimeUtc[0]);

			var localHour = hourUtc - parseInt(hourOffsetFromUtc);
			if(localHour > 23){
				localHour = localHour - 24;
			}
			if(localHour < 0){
				localHour = localHour + 24;
			}
			return moment().hours(localHour).minutes(minutes);
		};
        
        reminderService.addToTrackingReminderSyncQueue = function(trackingReminder) {
        	localStorageService.addToOrReplaceElementOfItemByIdOrMoveToFront('trackingReminderSyncQueue', trackingReminder);
		};

		reminderService.syncTrackingReminderSyncQueueToServer = function() {
			reminderService.createDefaultReminders();
			localStorageService.getItem('trackingReminderSyncQueue', function (trackingReminders) {
				if(trackingReminders){
					reminderService.postTrackingRemindersDeferred(JSON.parse(trackingReminders)).then(function () {
						console.debug('reminder queue synced' + trackingReminders);
						localStorageService.deleteItem('trackingReminderSyncQueue');
                        reminderService.refreshTrackingReminderNotifications().then(function(){
							console.debug('reminderService.syncTrackingReminderSyncQueueToServer successfully refreshed notifications');
						}, function (error) {
							console.error('reminderService.syncTrackingReminderSyncQueueToServer: ' + error);
						});
					}, function(error) {
						if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
					});
				} else {
					console.debug('No reminders to sync');
				}
			});
		};

		reminderService.deleteNotificationFromLocalStorage = function(body){
			var trackingReminderNotificationId = body;
			if(isNaN(trackingReminderNotificationId) && body.trackingReminderNotification){
				trackingReminderNotificationId = body.trackingReminderNotification.id;
			}
			if(isNaN(trackingReminderNotificationId) && body.trackingReminderNotificationId){
				trackingReminderNotificationId = body.trackingReminderNotificationId;
			}
			$rootScope.numberOfPendingNotifications -= $rootScope.numberOfPendingNotifications;
			localStorageService.deleteElementOfItemById('trackingReminderNotifications',
				trackingReminderNotificationId);
			/* We don't have separate items for categories
			if(body.trackingReminderNotification && typeof body.trackingReminderNotification.variableCategoryName !== "undefined"){
				localStorageService.deleteElementOfItemById('trackingReminderNotifications' +
					body.trackingReminderNotification.variableCategoryName,
					trackingReminderNotificationId);
			}*/
		};

		reminderService.groupTrackingReminderNotificationsByDateRange = function (trackingReminderNotifications) {
			var result = [];
			var reference = moment().local();
			var today = reference.clone().startOf('day');
			var yesterday = reference.clone().subtract(1, 'days').startOf('day');
			var weekold = reference.clone().subtract(7, 'days').startOf('day');
			var monthold = reference.clone().subtract(30, 'days').startOf('day');

			var todayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
				return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isSame(today, 'd') === true;
			});

			if (todayResult.length) {
				result.push({name: "Today", trackingReminderNotifications: todayResult});
			}

			var yesterdayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
				return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isSame(yesterday, 'd') === true;
			});

			if (yesterdayResult.length) {
				result.push({name: "Yesterday", trackingReminderNotifications: yesterdayResult});
			}

			var last7DayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
				var date = moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local();

				return date.isAfter(weekold) === true && date.isSame(yesterday, 'd') !== true &&
					date.isSame(today, 'd') !== true;
			});

			if (last7DayResult.length) {
				result.push({name: "Last 7 Days", trackingReminderNotifications: last7DayResult});
			}

			var last30DayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {

				var date = moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local();

				return date.isAfter(monthold) === true && date.isBefore(weekold) === true &&
					date.isSame(yesterday, 'd') !== true && date.isSame(today, 'd') !== true;
			});

			if (last30DayResult.length) {
				result.push({name: "Last 30 Days", trackingReminderNotifications: last30DayResult});
			}

			var olderResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
				return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isBefore(monthold) === true;
			});

			if (olderResult.length) {
				result.push({name: "Older", trackingReminderNotifications: olderResult});
			}

			return result;
		};

		reminderService.getTrackingRemindersFromLocalStorage = function (variableCategoryName){
			var deferred = $q.defer();
			var allReminders = [];
			var nonFavoriteReminders = [];
			var unfilteredReminders = JSON.parse(localStorageService.getItemSync('trackingReminders'));
			unfilteredReminders =
				quantimodoService.attachVariableCategoryIcons(unfilteredReminders);
			if(unfilteredReminders) {
				for(var k = 0; k < unfilteredReminders.length; k++){
					if(unfilteredReminders[k].reminderFrequency !== 0){
						nonFavoriteReminders.push(unfilteredReminders[k]);
					}
				}
				if(variableCategoryName && variableCategoryName !== 'Anything') {
					for(var j = 0; j < nonFavoriteReminders.length; j++){
						if(variableCategoryName === nonFavoriteReminders[j].variableCategoryName){
							allReminders.push(nonFavoriteReminders[j]);
						}
					}
				} else {
					allReminders = nonFavoriteReminders;
				}
				allReminders = reminderService.addRatingTimesToDailyReminders(allReminders);
				deferred.resolve(allReminders);
			}
			return deferred.promise;
		};

		reminderService.createDefaultReminders = function () {
			var deferred = $q.defer();

			localStorageService.getItem('defaultRemindersCreated', function (defaultRemindersCreated) {
				if(JSON.parse(defaultRemindersCreated) !== true) {
					var defaultReminders = config.appSettings.defaultReminders;
					if(defaultReminders && defaultReminders.length){
						localStorageService.addToOrReplaceElementOfItemByIdOrMoveToFront('trackingReminders', defaultReminders);
						console.debug('Creating default reminders ' + JSON.stringify(defaultReminders));
						reminderService.postTrackingRemindersDeferred(defaultReminders).then(function () {
							console.debug('Default reminders created ' + JSON.stringify(defaultReminders));
							reminderService.refreshTrackingReminderNotifications().then(function(){
								console.debug('reminderService.createDefaultReminders successfully refreshed notifications');
							}, function (error) {
								console.error('reminderService.createDefaultReminders: ' + error);
							});
							reminderService.refreshTrackingRemindersAndScheduleAlarms();
							localStorageService.setItem('defaultRemindersCreated', true);
							deferred.resolve();
						}, function(error) {
							if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
							deferred.reject();
						});
					}
				} else {
					console.debug('Default reminders already created');
				}
			});
			return deferred.promise;
		};

		return reminderService;
	});